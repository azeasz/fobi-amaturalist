<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\DataQualityAssessmentKupnes;
use App\Models\CommunityIdentification;
use App\Models\LocationVerification;
use App\Models\WildStatusVote;
use App\Models\EvidenceVerification;
use App\Traits\QualityAssessmentTrait;
use App\Models\KupunesiaIdentification;
use Intervention\Image\ImageManagerStatic as Image;

class KupunesiaObservationApiController extends Controller
{
    use QualityAssessmentTrait;

    private function processImageFile($file)
    {
        try {
            $uploadPath = storage_path('app/public/uploads');
            if (!file_exists($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }

            $image = Image::make($file->getRealPath());

            // Resize gambar dengan mempertahankan aspect ratio
            $image->resize(1200, 1200, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            });

            $fileName = uniqid('img_') . '.jpg';
            $relativePath = 'uploads/' . $fileName;
            $fullPath = storage_path('app/public/' . $relativePath);

            // Simpan gambar dengan kualitas 80%
            $image->save($fullPath, 80);

            return [
                'imagePath' => $relativePath,
                'success' => true
            ];

        } catch (\Exception $e) {
            Log::error('Error processing image file: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function storeChecklistAndFauna(Request $request)
    {
        try {
            $request->validate([
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
                'tujuan_pengamatan' => 'required|integer',
                'fauna_id.*' => 'required|integer',
                'count.*' => 'required|integer',
                'notes.*' => 'nullable|string',
                'observer' => 'nullable|string',
                'completed' => 'nullable|integer',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i',
                'active' => 'nullable|integer',
                'additional_note' => 'nullable|string',
                'tgl_pengamatan' => 'nullable|date',
                'images.*.*' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:10048',
            ]);

            Log::info('Request data:', $request->all());

            $userId = JWTAuth::parseToken()->authenticate()->id;
            $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();

            if (!$fobiUser) {
                return response()->json(['error' => 'User tidak ditemukan.'], 404);
            }

            $kupunesiaUserId = $fobiUser->kupunesia_user_id;
            $checklistId = null;

            DB::transaction(function () use ($request, $userId, $kupunesiaUserId, &$checklistId) {
                // Simpan checklist
                $checklistId = DB::table('fobi_checklists_kupnes')->insertGetId([
                    'fobi_user_id' => $userId,
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'tujuan_pengamatan' => $request->tujuan_pengamatan,
                    'observer' => $request->observer,
                    'additional_note' => $request->additional_note,
                    'active' => $request->active,
                    'tgl_pengamatan' => $request->tgl_pengamatan,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'completed' => $request->completed,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Simpan fauna data
                $faunaIds = $request->fauna_id;
                foreach ($faunaIds as $index => $faunaId) {
                    // Simpan fauna checklist
                    DB::table('fobi_checklist_faunasv2')->insert([
                        'checklist_id' => $checklistId,
                        'fauna_id' => $faunaId,
                        'count' => $request->count[$index] ?? 0,
                        'notes' => $request->notes[$index] ?? null,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    // Ganti bagian quality assessment yang lama
                    $observation = (object)[
                        'tgl_pengamatan' => $request->tgl_pengamatan,
                        'latitude' => $request->latitude,
                        'longitude' => $request->longitude,
                        'images' => $request->file("images.$index") ?? [],
                        'fauna_id' => $faunaId
                    ];

                    $quality = $this->assessQuality($observation);

                    DB::table('data_quality_assessments_kupnes')->insert([
                        'observation_id' => $checklistId,
                        'fauna_id' => $faunaId,
                        'grade' => $quality['grade'],
                        'has_date' => $quality['has_date'],
                        'has_location' => $quality['has_location'],
                        'has_media' => $quality['has_media'],
                        'is_wild' => $quality['is_wild'],
                        'location_accurate' => $quality['location_accurate'],
                        'recent_evidence' => $quality['recent_evidence'],
                        'related_evidence' => $quality['related_evidence'],
                        'needs_id' => $quality['needs_id'],
                        'community_id_level' => $quality['community_id_level'],
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    // Upload dan simpan gambar jika ada
                    if ($request->hasFile("images.$index")) {
                        foreach ($request->file("images.$index") as $imageFile) {
                            // Ganti dengan proses kompresi gambar
                            $result = $this->processImageFile($imageFile);

                            if ($result['success']) {
                                DB::table('fobi_checklist_fauna_imgs_kupnes')->insert([
                                    'checklist_id' => $checklistId,
                                    'fauna_id' => $faunaId,
                                    'images' => asset('storage/' . $result['imagePath']),
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);

                                // Update has_media di quality assessment
                                DataQualityAssessmentKupnes::where('observation_id', $checklistId)
                                    ->where('fauna_id', $faunaId)
                                    ->update(['has_media' => true]);
                            }
                        }
                    }
                }

                // Simpan ke database Kupunesia
                $checklistIdThird = DB::connection('third')->table('checklists')->insertGetId([
                    'user_id' => $kupunesiaUserId,
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'tujuan_pengamatan' => $request->tujuan_pengamatan,
                    'observer' => $request->observer,
                    'additional_note' => $request->additional_note,
                    'active' => $request->active,
                    'tgl_pengamatan' => $request->tgl_pengamatan,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'completed' => $request->completed,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ($faunaIds as $index => $faunaId) {
                    DB::connection('third')->table('checklist_fauna')->insert([
                        'checklist_id' => $checklistIdThird,
                        'fauna_id' => $faunaId,
                        'count' => $request->count[$index],
                        'notes' => $request->notes[$index],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Data berhasil diunggah ke kedua database!',
                'checklist_id' => $checklistId
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error uploading data: ' . $e->getMessage());
            return response()->json(['error' => 'Terjadi kesalahan saat mengunggah data.'], 500);
        }
    }

    /**
     * Add community identification
     */
    public function addIdentification(Request $request, $id)
    {
        try {
            // Log request data untuk debugging
            Log::info('Identification request data:', $request->all());

            $validated = $request->validate([
                'taxon_id' => 'required|integer|exists:taxas,id',
                'identification_level' => 'required|string|in:species,genus,family,order,class,phylum,kingdom',
                'comment' => 'nullable|string|max:1000',
                'photo' => 'nullable|image|max:5120'
            ]);

            // Mulai transaksi database
            DB::beginTransaction();

            try {
                // Handle file upload jika ada
                $photoPath = null;
                if ($request->hasFile('photo')) {
                    $photoPath = $request->file('photo')->store('identification-photos', 'public');
                }

                $identification = KupunesiaIdentification::create([
                    'observation_id' => $id,
                    'observation_type' => 'kupunesia',
                    'user_id' => auth()->id(),
                    'taxon_id' => $validated['taxon_id'],
                    'identification_level' => $validated['identification_level'],
                    'comment' => $validated['comment'] ?? null,
                    'photo_path' => $photoPath,
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Identifikasi berhasil ditambahkan',
                    'data' => $identification
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Database error while adding identification: ' . $e->getMessage());
                throw $e;
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error: ' . json_encode($e->errors()));
            return response()->json([
                'success' => false,
                'message' => 'Data tidak valid',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('Error adding identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan identifikasi'
            ], 500);
        }
    }

    public function agreeWithIdentification(Request $request, $id, $identificationId)
    {
        try {
            $userId = JWTAuth::parseToken()->authenticate()->id;

            // Cek apakah identifikasi ada
            $identification = DB::table('kupunesia_identifications')
                ->where('id', $identificationId)
                ->first();

            if (!$identification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Identifikasi tidak ditemukan'
                ], 404);
            }

            // Cek apakah user sudah setuju dengan identifikasi lain
            $existingAgreement = DB::table('kupunesia_identifications')
                ->where('observation_id', $id)
                ->where('observation_type', 'kupunesia')
                ->where('user_id', $userId)
                ->where('agrees_with_id', '!=', null)
                ->first();

            if ($existingAgreement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah menyetujui identifikasi lain'
                ], 400);
            }

            // Tambah persetujuan
            DB::table('kupunesia_identifications')->insert([
                'observation_id' => $id,
                'observation_type' => 'kupunesia',
                'user_id' => $userId,
                'agrees_with_id' => $identificationId,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Update quality assessment
            $this->updateIdentificationQuality($id);

            return response()->json([
                'success' => true,
                'message' => 'Berhasil menyetujui identifikasi'
            ]);

        } catch (\Exception $e) {
            Log::error('Error agreeing with identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyetujui identifikasi'
            ], 500);
        }
    }

    public function withdrawIdentification($id)
    {
        try {
            $identification = KupunesiaIdentification::findOrFail($id);

            // Pastikan user hanya bisa menarik identifikasinya sendiri
            if ($identification->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda hanya dapat menarik identifikasi yang Anda buat'
                ], 403);
            }

            // Hapus semua persetujuan/ketidaksetujuan terkait
            KupunesiaIdentification::where('agrees_with_id', $id)->delete();

            // Hapus identifikasi
            $identification->delete();

            return response()->json([
                'success' => true,
                'message' => 'Identifikasi berhasil ditarik'
            ]);

        } catch (\Exception $e) {
            Log::error('Error withdrawing identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menarik identifikasi'
            ], 500);
        }
    }

    public function disagreeWithIdentification(Request $request, $id, $identificationId)
    {
        try {
            $request->validate([
                'comment' => 'required|string',
                'taxon_id' => 'required|integer'
            ]);

            $userId = JWTAuth::parseToken()->authenticate()->id;

            // Simpan ketidaksetujuan sebagai identifikasi baru
            DB::table('kupunesia_identifications')->insert([
                'observation_id' => $id,
                'observation_type' => 'kupunesia',
                'user_id' => $userId,
                'taxon_id' => $request->taxon_id,
                'comment' => $request->comment,
                'disagrees_with_id' => $identificationId,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Berhasil menambahkan ketidaksetujuan'
            ]);

        } catch (\Exception $e) {
            Log::error('Error disagreeing with identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan ketidaksetujuan'
            ], 500);
        }
    }

    private function updateIdentificationQuality($checklistId)
    {
        try {
            // Hitung jumlah identifikasi dan persetujuan
            $identificationCount = DB::table('kupunesia_identifications')
                ->where('observation_id', $checklistId)
                ->where('observation_type', 'kupunesia')
                ->where('agrees_with_id', null)
                ->count();

            $agreementCount = DB::table('kupunesia_identifications')
                ->where('observation_id', $checklistId)
                ->where('observation_type', 'kupunesia')
                ->where('agrees_with_id', '!=', null)
                ->count();

            // Update quality assessment
            DB::table('data_quality_assessments_kupnes')
                ->where('observation_id', $checklistId)
                ->update([
                    'identification_count' => $identificationCount,
                    'agreement_count' => $agreementCount,
                    'updated_at' => now()
                ]);

        } catch (\Exception $e) {
            Log::error('Error updating identification quality: ' . $e->getMessage());
        }
    }

    private function getIdentificationDetail($identificationId)
    {
        return DB::select("
            SELECT
                ci.*,
                u.uname as identifier_name,
                u.created_at as identifier_joined_date,
                t.kupnes_fauna_id,
                f.nameId as fauna_name_id,
                f.nameLat as fauna_name_lat,
                (SELECT COUNT(*) FROM kupunesia_identifications WHERE user_id = u.id) as identifier_identification_count,
                (SELECT COUNT(*) FROM kupunesia_identifications WHERE agrees_with_id = ci.id) as agreement_count
            FROM kupunesia_identifications ci
            JOIN fobi_users u ON ci.user_id = u.id
            JOIN taxas t ON ci.taxon_id = t.kupnes_fauna_id
            JOIN " . DB::connection('third')->getDatabaseName() . ".faunas f ON t.kupnes_fauna_id = f.id
            WHERE ci.id = ?
        ", [$identificationId])[0] ?? null;
    }

    /**
     * Add location verification
     */
    public function verifyLocation(Request $request)
    {
        try {
            $request->validate([
                'observation_id' => 'required|integer',
                'is_accurate' => 'required|boolean',
                'reason' => 'nullable|string'
            ]);

            $verification = LocationVerification::create([
                'observation_id' => $request->observation_id,
                'observation_type' => 'kupunesia',
                'user_id' => auth()->id(),
                'is_accurate' => $request->is_accurate,
                'reason' => $request->reason
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Verifikasi lokasi berhasil ditambahkan',
                'data' => $verification
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error verifying location: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memverifikasi lokasi'
            ], 500);
        }
    }

    /**
     * Add wild status vote
     */
    public function voteWildStatus(Request $request)
    {
        try {
            $request->validate([
                'observation_id' => 'required|integer',
                'is_wild' => 'required|boolean',
                'reason' => 'nullable|string'
            ]);

            $vote = WildStatusVote::create([
                'observation_id' => $request->observation_id,
                'observation_type' => 'kupunesia',
                'user_id' => auth()->id(),
                'is_wild' => $request->is_wild,
                'reason' => $request->reason
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Vote status wild berhasil ditambahkan',
                'data' => $vote
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error voting wild status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan vote'
            ], 500);
        }
    }

    /**
     * Add evidence verification
     */
    public function verifyEvidence(Request $request)
    {
        try {
            $request->validate([
                'observation_id' => 'required|integer',
                'is_valid_evidence' => 'required|boolean',
                'is_recent' => 'required|boolean',
                'is_related' => 'required|boolean',
                'notes' => 'nullable|string'
            ]);

            $verification = EvidenceVerification::create([
                'observation_id' => $request->observation_id,
                'observation_type' => 'kupunesia',
                'user_id' => auth()->id(),
                'is_valid_evidence' => $request->is_valid_evidence,
                'is_recent' => $request->is_recent,
                'is_related' => $request->is_related,
                'notes' => $request->notes
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Verifikasi bukti berhasil ditambahkan',
                'data' => $verification
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error verifying evidence: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memverifikasi bukti'
            ], 500);
        }
    }

    public function getFaunaId(Request $request)
    {
        try {
            $name = $request->input('name');

            // Coba cari di database third (Kupunesia) terlebih dahulu
            $faunas = DB::connection('third')
                ->table('faunas')
                ->where('nameId', 'like', "%{$name}%")
                ->orWhere('nameLat', 'like', "%{$name}%")
                ->orWhere('nameEn', 'like', "%{$name}%")
                ->select('id', 'nameId', 'nameLat', 'nameEn')
                ->limit(10)
                ->get();


            return response()->json([
                'success' => true,
                'data' => $faunas->map(function($fauna) {
                    return [
                        'id' => $fauna->id,
                        'nameId' => $fauna->nameId,
                        'nameLat' => $fauna->nameLat,
                        'displayName' => $fauna->nameId . ' (' . $fauna->nameLat . ')'
                    ];
                })
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching fauna: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Terjadi kesalahan saat mencari data fauna.'
            ], 500);
        }
    }
    public function getObservations(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $page = $request->input('page', 1);

            // 1. Filter pencarian species/genus/family
            $searchQuery = $request->input('search');

            // 2. Filter tanggal
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');

            // 3. Filter lokasi
            $latitude = $request->input('latitude');
            $longitude = $request->input('longitude');
            $radius = $request->input('radius', 10); // default 10km

            // Query untuk data FOBI dengan filter
            $fobiData = DB::table('fobi_checklists_kupnes')
                ->join('fobi_checklist_faunasv2', 'fobi_checklists_kupnes.id', '=', 'fobi_checklist_faunasv2.checklist_id')
                ->join('data_quality_assessments_kupnes', function($join) {
                    $join->on('fobi_checklists_kupnes.id', '=', 'data_quality_assessments_kupnes.observation_id')
                         ->on('fobi_checklist_faunasv2.fauna_id', '=', 'data_quality_assessments_kupnes.fauna_id');
                })
                ->join('fobi_users', 'fobi_checklists_kupnes.fobi_user_id', '=', 'fobi_users.id')
                ->joinSub(
                    DB::connection('third')->table('faunas')->select('id', 'nameId', 'nameLat', 'family'),
                    'third_faunas',
                    function($join) {
                        $join->on('fobi_checklist_faunasv2.fauna_id', '=', 'third_faunas.id');
                    }
                );

            // Terapkan filter pencarian
            if ($searchQuery) {
                $fobiData->leftJoin('taxas', 'third_faunas.id', '=', 'taxas.kupnes_fauna_id')
                    ->where(function($query) use ($searchQuery) {
                        $query->where('third_faunas.nameId', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('third_faunas.nameLat', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('third_faunas.family', 'LIKE', "%{$searchQuery}%")
                            // Tambahan pencarian dari tabel taxas
                            ->orWhere('taxas.scientific_name', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('taxas.genus', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('taxas.species', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('taxas.family', 'LIKE', "%{$searchQuery}%");
                    });
            }

            // Terapkan filter tanggal
            if ($startDate) {
                $fobiData->where('fobi_checklists_kupnes.tgl_pengamatan', '>=', $startDate);
            }
            if ($endDate) {
                $fobiData->where('fobi_checklists_kupnes.tgl_pengamatan', '<=', $endDate);
            }

            // Terapkan filter lokasi dengan Haversine formula
            if ($latitude && $longitude) {
                $haversine = "(6371 * acos(cos(radians($latitude))
                             * cos(radians(fobi_checklists_kupnes.latitude))
                             * cos(radians(fobi_checklists_kupnes.longitude)
                             - radians($longitude))
                             + sin(radians($latitude))
                             * sin(radians(fobi_checklists_kupnes.latitude))))";

                $fobiData->whereRaw("{$haversine} <= ?", [$radius]);
            }

            // Tambahkan filter polygon jika ada
            if ($request->has('polygon')) {
                $polygonCoords = explode('|', $request->polygon);
                $polygonPoints = [];
                
                foreach ($polygonCoords as $coord) {
                    list($lng, $lat) = explode(',', $coord);
                    $polygonPoints[] = [$lng, $lat];
                }
                
                // Dapatkan bounding box dari polygon untuk filter awal
                $minLat = $maxLat = $polygonPoints[0][1];
                $minLng = $maxLng = $polygonPoints[0][0];
                
                foreach ($polygonPoints as $point) {
                    $minLat = min($minLat, $point[1]);
                    $maxLat = max($maxLat, $point[1]);
                    $minLng = min($minLng, $point[0]);
                    $maxLng = max($maxLng, $point[0]);
                }
                
                // Filter berdasarkan bounding box terlebih dahulu (lebih efisien)
                $fobiData->where('fobi_checklists_kupnes.latitude', '>=', $minLat)
                         ->where('fobi_checklists_kupnes.latitude', '<=', $maxLat)
                         ->where('fobi_checklists_kupnes.longitude', '>=', $minLng)
                         ->where('fobi_checklists_kupnes.longitude', '<=', $maxLng);
                
                // Simpan polygon points untuk digunakan di PHP
                $request->merge(['polygon_points' => $polygonPoints]);
            }

            // Lanjutkan dengan select statement
            $fobiData = $fobiData->select(
                'fobi_checklists_kupnes.id',
                'fobi_checklists_kupnes.latitude',
                'fobi_checklists_kupnes.longitude',
                'fobi_checklist_faunasv2.fauna_id',
                'fobi_checklist_faunasv2.count',
                'fobi_checklist_faunasv2.notes',
                'data_quality_assessments_kupnes.grade',
                'data_quality_assessments_kupnes.has_media',
                'fobi_users.uname as observer_name',
                'fobi_users.id as observer_id',
                'third_faunas.nameId',
                'third_faunas.nameLat',
                'third_faunas.family',
                DB::raw("'fobi' as source"),
                'fobi_checklists_kupnes.tgl_pengamatan as observation_date',
                'fobi_checklists_kupnes.created_at'
            )->get();

            // Query untuk data Kupunesia dengan filter yang sama
            $kupunesiaData = DB::connection('third')->table('checklists as k_checklists')
                ->join('checklist_fauna as k_checklist_fauna', 'k_checklists.id', '=', 'k_checklist_fauna.checklist_id')
                ->join('faunas as k_faunas', 'k_checklist_fauna.fauna_id', '=', 'k_faunas.id')
                ->join('users as k_users', 'k_checklists.user_id', '=', 'k_users.id')
                ->whereIn('k_faunas.family', [
                    'Papilionidae', 'Pieridae', 'Nymphalidae',
                    'Lycaenidae', 'Hesperiidae', 'Riodinidae'
                ]);

            // Terapkan filter yang sama untuk Kupunesia
            if ($searchQuery) {
                $kupunesiaData->where(function($query) use ($searchQuery) {
                    $query->where('k_faunas.nameId', 'LIKE', "%{$searchQuery}%")
                        ->orWhere('k_faunas.nameLat', 'LIKE', "%{$searchQuery}%")
                        ->orWhere('k_faunas.family', 'LIKE', "%{$searchQuery}%");
                });
            }

            if ($startDate) {
                $kupunesiaData->where('k_checklists.tgl_pengamatan', '>=', $startDate);
            }
            if ($endDate) {
                $kupunesiaData->where('k_checklists.tgl_pengamatan', '<=', $endDate);
            }

            if ($latitude && $longitude) {
                $haversine = "(6371 * acos(cos(radians($latitude))
                             * cos(radians(k_checklists.latitude))
                             * cos(radians(k_checklists.longitude)
                             - radians($longitude))
                             + sin(radians($latitude))
                             * sin(radians(k_checklists.latitude))))";

                $kupunesiaData->whereRaw("{$haversine} <= ?", [$radius]);
            }

            // Tambahkan filter polygon jika ada
            if ($request->has('polygon')) {
                $polygonPoints = $request->polygon_points;
                
                $minLat = $maxLat = $polygonPoints[0][1];
                $minLng = $maxLng = $polygonPoints[0][0];
                
                foreach ($polygonPoints as $point) {
                    $minLat = min($minLat, $point[1]);
                    $maxLat = max($maxLat, $point[1]);
                    $minLng = min($minLng, $point[0]);
                    $maxLng = max($maxLng, $point[0]);
                }
                
                $kupunesiaData->where('k_checklists.latitude', '>=', $minLat)
                             ->where('k_checklists.latitude', '<=', $maxLat)
                             ->where('k_checklists.longitude', '>=', $minLng)
                             ->where('k_checklists.longitude', '<=', $maxLng);
            }

            // Query untuk data Kupunesia
            $kupunesiaData = $kupunesiaData->select(
                'k_checklists.id',
                'k_checklists.latitude',
                'k_checklists.longitude',
                'k_checklist_fauna.fauna_id',
                'k_checklist_fauna.count',
                'k_checklist_fauna.notes',
                DB::raw("'checklist kupunesia' as grade"),
                DB::raw('0 as has_media'),
                'k_users.uname as observer_name',
                'k_faunas.nameId',
                'k_faunas.nameLat',
                'k_faunas.family',
                DB::raw("'kupunesia' as source"),
                'k_checklists.tgl_pengamatan as observation_date',
                'k_checklists.created_at'
            )->get();

            // Log jumlah data dari masing-masing sumber
            Log::info('Data counts:', [
                'fobi_count' => $fobiData->count(),
                'kupunesia_count' => $kupunesiaData->count()
            ]);

            // Gabungkan kedua koleksi
            $allData = $fobiData->concat($kupunesiaData)
                ->sortByDesc('created_at');

            // Manual pagination
            $total = $allData->count();
            $items = $allData->forPage($page, $perPage);

            // Proses data gambar dan count
            foreach ($items as $observation) {
                if ($observation->source === 'fobi') {
                    $observation->images = DB::table('fobi_checklist_fauna_imgs_kupnes')
                        ->where('checklist_id', $observation->id)
                        ->where('fauna_id', $observation->fauna_id)
                        ->select('id', 'images as url')
                        ->get();
                } else {
                    $observation->images = DB::connection('third')
                        ->table('checklist_fauna_imgs')
                        ->where('checklist_id', $observation->id)
                        ->where('fauna_id', $observation->fauna_id)
                        ->select('id', 'images as url')
                        ->get();
                }

                $observation->fobi_count = DB::table('fobi_checklist_faunasv2')
                    ->where('fauna_id', $observation->fauna_id)
                    ->count();

                $observation->kupunesia_count = DB::connection('third')
                    ->table('checklist_fauna as k_checklist_fauna')
                    ->join('faunas as k_faunas', 'k_checklist_fauna.fauna_id', '=', 'k_faunas.id')
                    ->where('k_checklist_fauna.fauna_id', $observation->fauna_id)
                    ->whereIn('k_faunas.family', [
                        'Papilionidae', 'Pieridae', 'Nymphalidae',
                        'Lycaenidae', 'Hesperiidae', 'Riodinidae'
                    ])
                    ->count();

// Di method getUserObservations
$observation->total_identifications = DB::table('taxa_identifications')
    ->where('checklist_id', $observation->id)
    ->where('is_first', true) // Hanya hitung identifikasi pertama
    ->whereNull('burnes_checklist_id')
    ->whereNull('kupnes_checklist_id')
    ->where(function($query) {
        $query->where('is_agreed', true)
              ->orWhereNull('is_agreed');
    })
    ->where(function($query) {
        $query->where('is_withdrawn', false)
              ->orWhereNull('is_withdrawn');
    })
    ->count();

// Juga tambahkan perhitungan agreement count
$observation->agreement_count = DB::table('taxa_identifications')
    ->where('checklist_id', $observation->id)
    ->where('is_agreed', true)
    ->whereNull('burnes_checklist_id')
    ->whereNull('kupnes_checklist_id')
    ->where('is_withdrawn', false)
    ->count();
}

            return response()->json([
                'success' => true,
                'data' => $items->values()->all(),
                'meta' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => ceil($total / $perPage)
                ],
                'debug' => [
                    'fobi_count' => $fobiData->count(),
                    'kupunesia_count' => $kupunesiaData->count(),
                    'search_params' => [
                        'query' => $searchQuery,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                        'radius' => $radius
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getObservations:', ['message' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data observasi',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function getUserObservations(Request $request)
    {
        try {
            $userId = JWTAuth::parseToken()->authenticate()->id;
            $perPage = $request->input('per_page', 100);
            $thirdDb = DB::connection('third');

            $observations = DB::table('fobi_checklists_kupnes')
                ->join('fobi_checklist_faunasv2', 'fobi_checklists_kupnes.id', '=', 'fobi_checklist_faunasv2.checklist_id')
                ->join('data_quality_assessments_kupnes', function($join) {
                    $join->on('fobi_checklists_kupnes.id', '=', 'data_quality_assessments_kupnes.observation_id')
                         ->on('fobi_checklist_faunasv2.fauna_id', '=', 'data_quality_assessments_kupnes.fauna_id');
                })
                ->join('fobi_users', 'fobi_checklists_kupnes.fobi_user_id', '=', 'fobi_users.id')
                ->joinSub(
                    $thirdDb->table('faunas')->select('id', 'nameId', 'nameLat', 'family'),
                    'third_faunas',
                    function($join) {
                        $join->on('fobi_checklist_faunasv2.fauna_id', '=', 'third_faunas.id');
                    }
                )
                ->where('fobi_checklists_kupnes.fobi_user_id', $userId)
                ->select(
                    'fobi_checklists_kupnes.*',
                    'fobi_checklist_faunasv2.fauna_id',
                    'fobi_checklist_faunasv2.count',
                    'fobi_checklist_faunasv2.notes',
                    'data_quality_assessments_kupnes.grade',
                    'data_quality_assessments_kupnes.has_media',
                    'data_quality_assessments_kupnes.is_wild',
                    'data_quality_assessments_kupnes.location_accurate',
                    'data_quality_assessments_kupnes.needs_id',
                    'data_quality_assessments_kupnes.community_id_level',
                    'fobi_users.uname as observer_name',
                    'third_faunas.nameId',
                    'third_faunas.nameLat',
                    'third_faunas.family',
                    DB::raw('(SELECT COUNT(DISTINCT user_id) FROM community_identifications WHERE observation_id = fobi_checklists_kupnes.id AND observation_type = "kupunesia") as identifications_count')
                )
                ->orderBy('fobi_checklists_kupnes.created_at', 'desc')
                ->paginate($perPage);

            // Tambahkan data gambar untuk setiap observasi
            foreach ($observations as $observation) {
                $observation->images = DB::table('fobi_checklist_fauna_imgs_kupnes')
                    ->where('checklist_id', $observation->id)
                    ->where('fauna_id', $observation->fauna_id)
                    ->select('id', 'images as url')
                    ->get();

                // Tambahkan total checklist
                $observation->fobi_count = DB::table('fobi_checklist_faunasv2')
                    ->where('fauna_id', $observation->fauna_id)
                    ->count();

                $observation->kupunesia_count = DB::connection('third')
                    ->table('checklist_fauna as k_checklist_fauna')
                    ->join('faunas as k_faunas', 'k_checklist_fauna.fauna_id', '=', 'k_faunas.id')
                    ->where('k_checklist_fauna.fauna_id', $observation->fauna_id)
                    ->whereIn('k_faunas.family', [
                        'Papilionidae', 'Pieridae', 'Nymphalidae',
                        'Lycaenidae', 'Hesperiidae', 'Riodinidae',
                        'Hedylidae', 'Columbidae'
                    ])
                    ->count();
            }

            return response()->json([
                'success' => true,
                'data' => $observations->items(),
                'meta' => [
                    'current_page' => $observations->currentPage(),
                    'per_page' => $observations->perPage(),
                    'total' => $observations->total(),
                    'last_page' => $observations->lastPage()
                ],
                'links' => [
                    'first' => $observations->url(1),
                    'last' => $observations->url($observations->lastPage()),
                    'prev' => $observations->previousPageUrl(),
                    'next' => $observations->nextPageUrl()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching user observations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data observasi pengguna'
            ], 500);
        }
    }

    public function getChecklistDetail($id)
    {
        try {
            $userId = auth()->id();

            // Ambil data checklist dasar dengan raw query
            $baseChecklist = DB::select("
                SELECT
                    fc.*,
                    fu.uname as observer_name,
                    dqa.grade as quality_grade,
                    dqa.has_media,
                    dqa.has_date,
                    dqa.has_location,
                    dqa.is_wild,
                    dqa.location_accurate,
                    dqa.needs_id,
                    dqa.community_id_level
                FROM fobi_checklists_kupnes fc
                JOIN fobi_users fu ON fc.fobi_user_id = fu.id
                LEFT JOIN data_quality_assessments_kupnes dqa ON fc.id = dqa.observation_id
                WHERE fc.id = ?
            ", [$id]);

            if (empty($baseChecklist)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Checklist tidak ditemukan'
                ], 404);
            }

            $baseChecklist = $baseChecklist[0];

            // Ambil data fauna dengan raw query
            $faunas = DB::select("
                SELECT
                    cf.*,
                    f.nameId,
                    f.nameLat,
                    f.family
                FROM fobi_checklist_faunasv2 cf
                JOIN " . DB::connection('third')->getDatabaseName() . ".faunas f ON cf.fauna_id = f.id
                WHERE cf.checklist_id = ?
            ", [$id]);

            // Perbaiki query media
            $medias = DB::select("
                SELECT
                    id,
                    images as url
                FROM fobi_checklist_fauna_imgs_kupnes
                WHERE checklist_id = ?
            ", [$id]);

            // Transform ke format yang diinginkan
            $formattedMedias = array_map(function($media) {
                return [
                    'id' => $media->id,
                    'type' => 'image',
                    'url' => $media->url
                ];
            }, $medias);

            // Debug final media data
            Log::info('Final media data:', [
                'checklist_id' => $id,
                'media_count' => count($formattedMedias),
                'media_data' => $formattedMedias
            ]);

            // Ambil identifikasi dengan join ke taxas dan faunas_kupnes
            $identifications = DB::select("
                SELECT
                    ci.*,
                    u.uname as identifier_name,
                    u.created_at as identifier_joined_date,
                    t.scientific_name,
                    t.cname_species,
                    COALESCE(t.scientific_name, fk.nameLat) as scientific_name,
                    COALESCE(t.cname_species, fk.nameId) as cname_species,
                    COALESCE(t.taxon_rank, 'species') as taxon_rank,
                    (SELECT COUNT(*) FROM kupunesia_identifications WHERE user_id = u.id) as identifier_identification_count,
                    (SELECT COUNT(*) FROM kupunesia_identifications WHERE agrees_with_id = ci.id) as agreement_count,
                    (SELECT COUNT(*) > 0 FROM kupunesia_identifications WHERE agrees_with_id = ci.id AND user_id = ?) as user_agreed
                FROM kupunesia_identifications ci
                JOIN fobi_users u ON ci.user_id = u.id
                LEFT JOIN taxas t ON t.kupnes_fauna_id = ci.taxon_id
                LEFT JOIN faunas_kupnes fk ON fk.id = ci.taxon_id
                WHERE ci.observation_id = ? AND ci.observation_type = 'kupunesia'
            ", [$userId, $id]);

            // Format identifikasi sebelum mengembalikan response
            $formattedIdentifications = array_map(function($identification) {
                return [
                    'id' => $identification->id,
                    'user_id' => $identification->user_id,
                    'identifier_name' => $identification->identifier_name,
                    'created_at' => $identification->created_at,
                    'taxon' => [
                        'scientific_name' => $identification->scientific_name,
                        'cname_species' => $identification->cname_species,
                        'taxon_rank' => $identification->taxon_rank
                    ],
                    'comment' => $identification->comment,
                    'agreement_count' => $identification->agreement_count,
                    'user_agreed' => (bool)$identification->user_agreed,
                    'identifier_identification_count' => $identification->identifier_identification_count
                ];
            }, $identifications);

            // Ambil verifikasi lokasi
            $locationVerifications = DB::select("
                SELECT *
                FROM location_verifications
                WHERE observation_id = ? AND observation_type = 'kupunesia'
            ", [$id]);

            // Ambil wild status votes
            $wildStatusVotes = DB::select("
                SELECT *
                FROM wild_status_votes
                WHERE observation_id = ? AND observation_type = 'kupunesia'
            ", [$id]);

            // Gabungkan semua data
            $checklist = (array) $baseChecklist;
            $checklist['faunas'] = $faunas;
            $checklist['medias'] = $formattedMedias;

            return response()->json([
                'success' => true,
                'data' => [
                    'checklist' => $checklist,
                    'medias' => $formattedMedias,
                    'identifications' => $formattedIdentifications,
                    'location_verifications' => $locationVerifications,
                    'wild_status_votes' => $wildStatusVotes
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching checklist detail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil detail checklist'
            ], 500);
        }
    }

    public function searchFauna(Request $request)
    {
        try {
            $query = $request->get('q');
            $results = [];

            // 1. Cari di tabel taxas (database utama) dengan kolom yang benar
            $taxas = DB::table('taxas')
                ->where('scientific_name', 'LIKE', "%{$query}%")
                ->orWhere('cname_species', 'LIKE', "%{$query}%")
                ->select(
                    'id',
                    'scientific_name as nameLat',
                    'cname_species as nameId',
                    'kupnes_fauna_id',
                    DB::raw("'taxas' as source")
                )
                ->get();

            // 2. Cari di tabel faunas (database Kupunesia)
            $faunas = DB::connection('third')->table('faunas')
                ->where('nameLat', 'LIKE', "%{$query}%")
                ->orWhere('nameId', 'LIKE', "%{$query}%")
                ->select(
                    'id',
                    'nameLat',
                    'nameId',
                    DB::raw('id as kupnes_fauna_id'),
                    DB::raw("'faunas' as source")
                )
                ->get();

            // Gabungkan hasil pencarian
            $results = $taxas->concat($faunas)
                ->unique('kupnes_fauna_id')
                ->sortBy('nameLat')
                ->values()
                ->take(10);

            return response()->json([
                'success' => true,
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching fauna: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari fauna'
            ], 500);
        }
    }

    public function getIdentifications($id)
    {
        try {
            Log::info('Fetching identifications for observation: ' . $id);

            $identifications = KupunesiaIdentification::with(['user'])
                ->where('observation_id', $id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($identification) {
                    // Ambil data taxa berdasarkan foreign key yang benar
                    $taxon = DB::table('taxas')
                        ->where('kupnes_fauna_id', $identification->taxon_id)
                        ->select([
                            'id',
                            'kupnes_fauna_id',
                            'scientific_name',
                            'cname_species',
                            'taxon_rank'
                        ])
                        ->first();

                    Log::info('Found taxon:', [
                        'identification_id' => $identification->id,
                        'taxon_id' => $identification->taxon_id,
                        'taxon' => $taxon
                    ]);

                    return [
                        'id' => $identification->id,
                        'user_id' => $identification->user_id,
                        'identifier_name' => $identification->user->name,
                        'taxon_id' => $identification->taxon_id,
                        'taxon' => $taxon ? [
                            'id' => $taxon->id,
                            'kupnes_fauna_id' => $taxon->kupnes_fauna_id,
                            'scientific_name' => $taxon->scientific_name,
                            'cname_species' => $taxon->cname_species,
                            'taxon_rank' => $taxon->taxon_rank
                        ] : null,
                        'comment' => $identification->comment,
                        'created_at' => $identification->created_at,
                        'agreement_count' => $identification->agreement_count ?? 0,
                        'disagreement_count' => $identification->disagreement_count ?? 0,
                        'user_agreed' => $identification->hasUserAgreed(auth()->id()),
                        'user_disagreed' => $identification->hasUserDisagreed(auth()->id()),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $identifications
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching identifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data identifikasi'
            ], 500);
        }
    }
}
