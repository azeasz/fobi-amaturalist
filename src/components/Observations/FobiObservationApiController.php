<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Traits\QualityAssessmentTrait;
use App\Models\CommunityIdentification;
use App\Models\LocationVerification;
use App\Models\WildStatusVote;
use App\Models\EvidenceVerification;
use Intervention\Image\ImageManagerStatic as Image;
use Illuminate\Support\Facades\Cache;

class FobiObservationApiController extends Controller
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

    private function generateSpectrogramWithEnv($soundPath, $spectrogramPath)
    {
        try {
            // Set environment variables
            $env = [
                'PATH' => '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                'PYTHONPATH' => '/var/www/talinara/venv/lib/python3.12/site-packages'
            ];

            $command = escapeshellcmd("/var/www/talinara/venv/bin/python " . base_path('/scripts/spectrogram.py') . " " .
                storage_path('app/public/' . $soundPath) . " " .
                storage_path('app/public/' . $spectrogramPath));

            Log::info('Running spectrogram command:', [
                'command' => $command,
                'env' => $env
            ]);

            // Jalankan command dengan environment yang sudah diset
            $process = proc_open($command, [
                0 => ["pipe", "r"],
                1 => ["pipe", "w"],
                2 => ["pipe", "w"]
            ], $pipes, null, $env);

            if (is_resource($process)) {
                $stdout = stream_get_contents($pipes[1]);
                $stderr = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($process);

                Log::info('Command output:', [
                    'stdout' => $stdout,
                    'stderr' => $stderr
                ]);

                if (!Storage::disk('public')->exists($spectrogramPath)) {
                    throw new \Exception("Gagal membuat spectrogram: $stderr");
                }

                return true;
            }

            throw new \Exception('Gagal menjalankan proses spectrogram');

        } catch (\Exception $e) {
            Log::error('Error generating spectrogram: ' . $e->getMessage());
            return false;
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
                'breeding.*' => 'required|boolean',
                'observer' => 'nullable|string',
                'breeding_note.*' => 'nullable|string',
                'breeding_type_id.*' => 'nullable|integer',
                'completed' => 'nullable|integer',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i',
                'active' => 'nullable|integer',
                'additional_note' => 'nullable|string',
                'tgl_pengamatan' => 'nullable|date',
                'images.*.*' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:10048',
                'sounds.*.*' => 'nullable|file|mimes:mp3,wav|max:15120',
            ]);

            Log::info('Request data:', $request->all());

            $userId = JWTAuth::parseToken()->authenticate()->id;
            $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();

            if (!$fobiUser) {
                return response()->json(['error' => 'User tidak ditemukan.'], 404);
            }

            $burungnesiaUserId = $fobiUser->burungnesia_user_id;

            DB::transaction(function () use ($request, $userId, $burungnesiaUserId) {
                $checklistId = DB::table('fobi_checklists')->insertGetId([
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

                // Pastikan data adalah array
                $faunaIds = is_array($request->fauna_id) ? $request->fauna_id : [$request->fauna_id];
                $counts = is_array($request->count) ? $request->count : [$request->count];
                $notes = is_array($request->notes) ? $request->notes : [$request->notes];
                $breedings = is_array($request->breeding) ? $request->breeding : [$request->breeding];
                $breedingNotes = is_array($request->breeding_note) ? $request->breeding_note : [$request->breeding_note];
                $breedingTypeIds = is_array($request->breeding_type_id) ? $request->breeding_type_id : [$request->breeding_type_id];

                foreach ($faunaIds as $index => $faunaId) {
                    DB::table('fobi_checklist_faunasv1')->insert([
                        'checklist_id' => $checklistId,
                        'fauna_id' => $faunaId,
                        'count' => $counts[$index],
                        'notes' => $notes[$index],
                        'breeding' => $breedings[$index],
                        'breeding_note' => $breedingNotes[$index],
                        'breeding_type_id' => $breedingTypeIds[$index],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    if ($request->hasFile("images.$index")) {
                        foreach ($request->file("images.$index") as $imageFile) {
                            $result = $this->processImageFile($imageFile);

                            if ($result['success']) {
                                DB::table('fobi_checklist_fauna_imgs')->insert([
                                    'checklist_id' => $checklistId,
                                    'fauna_id' => $faunaId,
                                    'images' => asset('storage/' . $result['imagePath']),
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }
                    }

                    if ($request->hasFile("sounds.$index")) {
                        foreach ($request->file("sounds.$index") as $soundFile) {
                            $soundPath = $soundFile->store('sounds', 'public');
                            $spectrogramPath = preg_replace('/\.(mp3|wav|ogg)$/i', '.png', $soundPath);

                            if ($this->generateSpectrogramWithEnv($soundPath, $spectrogramPath)) {
                                DB::table('fobi_checklist_sounds')->insert([
                                    'checklist_id' => $checklistId,
                                    'fauna_id' => $faunaId,
                                    'sounds' => asset('storage/' . $soundPath),
                                    'spectrogram' => asset('storage/' . $spectrogramPath),
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            } else {
                                Log::error('Failed to generate spectrogram for sound file', [
                                    'sound_path' => $soundPath
                                ]);
                            }
                        }
                    }

                    // Assess quality untuk setiap fauna
                    $observation = (object)[
                        'tgl_pengamatan' => $request->tgl_pengamatan,
                        'latitude' => $request->latitude,
                        'longitude' => $request->longitude,
                        'images' => $request->file("images.$index") ?? [],
                        'sounds' => $request->file("sounds.$index") ?? [],
                        'fauna_id' => $faunaId
                    ];

                    $quality = $this->assessQuality($observation);

                    DB::table('data_quality_assessments')->insert([
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
                }

                $checklistIdSecond = DB::connection('second')->table('checklists')->insertGetId([
                    'user_id' => $burungnesiaUserId,
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
                    DB::connection('second')->table('checklist_fauna')->insert([
                        'checklist_id' => $checklistIdSecond,
                        'fauna_id' => $faunaId,
                        'count' => $counts[$index],
                        'notes' => $notes[$index],
                        'breeding' => $breedings[$index],
                        'breeding_note' => $breedingNotes[$index],
                        'breeding_type_id' => $breedingTypeIds[$index],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Data berhasil diunggah dengan quality assessment!'
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error uploading data: ' . $e->getMessage());
            return response()->json([
                'error' => 'Terjadi kesalahan saat mengunggah data.'
            ], 500);
        }
    }

    public function getFaunaId(Request $request)
    {
        try {
            $name = $request->input('name');

            // Coba cari di database second (Burungnesia) terlebih dahulu
            $faunas = DB::connection('second')
                ->table('faunas')
                ->where('nameId', 'like', "%{$name}%")
                ->orWhere('nameLat', 'like', "%{$name}%")
                ->select('id', 'nameId', 'nameLat')
                ->limit(10)
                ->get();

            if ($faunas->isEmpty()) {
                // Jika tidak ditemukan, coba cari di database fobi
                $faunas = DB::table('faunas')
                    ->where('nameId', 'like', "%{$name}%")
                    ->orWhere('nameLat', 'like', "%{$name}%")
                    ->select('id', 'nameId', 'nameLat')
                    ->limit(10)
                    ->get();
            }

            return response()->json([
                'success' => true,
                'data' => $faunas->map(function($fauna) {
                    return [
                        'id' => $fauna->id,
                        'nameId' => $fauna->nameId,
                        'nameLat' => $fauna->nameLat,
                        'displayName' => $fauna->nameId
                    ];
                })
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching fauna: ' . $e->getMessage());

            // Jika terjadi error pada database second, langsung coba database fobi
            try {
                $faunas = DB::table('faunas')
                    ->where('nameId', 'like', "%{$name}%")
                    ->orWhere('nameLat', 'like', "%{$name}%")
                    ->select('id', 'nameId', 'nameLat')
                    ->limit(10)
                    ->get();

                return response()->json([
                    'success' => true,
                    'data' => $faunas->map(function($fauna) {
                        return [
                            'id' => $fauna->id,
                            'nameId' => $fauna->nameId,
                            'nameLat' => $fauna->nameLat,
                            'displayName' => $fauna->nameId
                        ];
                    })
                ]);

            } catch (\Exception $innerE) {
                Log::error('Error searching fauna in both databases: ' . $innerE->getMessage());
                return response()->json([
                    'success' => false,
                    'error' => 'Terjadi kesalahan saat mencari data fauna.'
                ], 500);
            }
        }
    }
    public function generateSpectrogram(Request $request)
    {
        try {
            $request->validate([
                'sounds.*' => 'required|file|mimes:mp3,wav,ogg|max:15120',
            ]);

            $spectrogramUrls = [];

            foreach ($request->file('sounds') as $soundFile) {
                $soundPath = $soundFile->store('sounds', 'public');
                $spectrogramPath = preg_replace('/\.(mp3|wav|ogg)$/i', '.png', $soundPath);

                if ($this->generateSpectrogramWithEnv($soundPath, $spectrogramPath)) {
                    $spectrogramUrls[] = asset('storage/' . $spectrogramPath);
                } else {
                    throw new \Exception('Gagal membuat spectrogram');
                }
            }

            return response()->json(['spectrogramUrls' => $spectrogramUrls], 200);
        } catch (\Exception $e) {
            Log::error('Error generating spectrogram: ' . $e->getMessage());
            return response()->json(['error' => 'Terjadi kesalahan saat membuat spektrogram.'], 500);
        }
    }

    /**
     * Add community identification
     */
    public function addIdentification(Request $request, $id)
    {
        try {
            $request->validate([
                'taxon_id' => 'required|integer',
                'identification_level' => 'required|string',
                'notes' => 'nullable|string'
            ]);

            $identification = CommunityIdentification::create([
                'observation_id' => $id,
                'observation_type' => 'burungnesia',
                'user_id' => auth()->id(),
                'taxon_id' => $request->taxon_id,
                'identification_level' => $request->identification_level,
                'notes' => $request->notes,
                'is_valid' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Identifikasi berhasil ditambahkan',
                'data' => $identification
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error adding identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan identifikasi'
            ], 500);
        }
    }

    /**
     * Add location verification
     */
    public function verifyLocation(Request $request, $id)
    {
        try {
            $request->validate([
                'is_accurate' => 'required|boolean',
                'reason' => 'nullable|string'
            ]);

            $verification = LocationVerification::create([
                'observation_id' => $id,
                'observation_type' => 'burungnesia',
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
    public function voteWildStatus(Request $request, $id)
    {
        try {
            $request->validate([
                'is_wild' => 'required|boolean',
                'reason' => 'nullable|string'
            ]);

            $vote = WildStatusVote::create([
                'observation_id' => $id,
                'observation_type' => 'burungnesia',
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
    public function verifyEvidence(Request $request, $id)
    {
        try {
            $request->validate([
                'is_valid_evidence' => 'required|boolean',
                'is_recent' => 'required|boolean',
                'is_related' => 'required|boolean',
                'notes' => 'nullable|string'
            ]);

            $verification = EvidenceVerification::create([
                'observation_id' => $id,
                'observation_type' => 'burungnesia',
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
    public function getObservations(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $page = $request->input('page', 1);

            // Filter parameters
            $searchQuery = $request->input('search');
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $latitude = $request->input('latitude');
            $longitude = $request->input('longitude');
            $radius = $request->input('radius', 10);

            // Query untuk data FOBI dengan filter
            $fobiData = DB::table('fobi_checklists')
                ->join('fobi_checklist_faunasv1', 'fobi_checklists.id', '=', 'fobi_checklist_faunasv1.checklist_id')
                ->join('data_quality_assessments', function($join) {
                    $join->on('fobi_checklists.id', '=', 'data_quality_assessments.observation_id')
                         ->on('fobi_checklist_faunasv1.fauna_id', '=', 'data_quality_assessments.fauna_id');
                })
                ->join('fobi_users', 'fobi_checklists.fobi_user_id', '=', 'fobi_users.id')
                ->joinSub(
                    DB::connection('second')->table('faunas')->select('id', 'nameId', 'nameLat', 'family'),
                    'second_faunas',
                    function($join) {
                        $join->on('fobi_checklist_faunasv1.fauna_id', '=', 'second_faunas.id');
                    }
                );

            // Terapkan filter pencarian
            if ($searchQuery) {
                $fobiData->leftJoin('taxas', 'second_faunas.id', '=', 'taxas.burnes_fauna_id')
                    ->where(function($query) use ($searchQuery) {
                        $query->where('second_faunas.nameId', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('second_faunas.nameLat', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('second_faunas.family', 'LIKE', "%{$searchQuery}%")
                            // Tambahan pencarian dari tabel taxas
                            ->orWhere('taxas.scientific_name', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('taxas.genus', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('taxas.species', 'LIKE', "%{$searchQuery}%")
                            ->orWhere('taxas.family', 'LIKE', "%{$searchQuery}%");
                    });
            }

            // Terapkan filter tanggal
            if ($startDate) {
                $fobiData->where('fobi_checklists.tgl_pengamatan', '>=', $startDate);
            }
            if ($endDate) {
                $fobiData->where('fobi_checklists.tgl_pengamatan', '<=', $endDate);
            }

            // Terapkan filter lokasi
            if ($latitude && $longitude) {
                $haversine = "(6371 * acos(cos(radians($latitude))
                             * cos(radians(fobi_checklists.latitude))
                             * cos(radians(fobi_checklists.longitude)
                             - radians($longitude))
                             + sin(radians($latitude))
                             * sin(radians(fobi_checklists.latitude))))";

                $fobiData->whereRaw("{$haversine} <= ?", [$radius]);
            }

            // Perbaiki query polygon untuk database tanpa fungsi spasial
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
                $fobiData->where('fobi_checklists.latitude', '>=', $minLat)
                         ->where('fobi_checklists.latitude', '<=', $maxLat)
                         ->where('fobi_checklists.longitude', '>=', $minLng)
                         ->where('fobi_checklists.longitude', '<=', $maxLng);
                
                // Simpan polygon points untuk digunakan di PHP
                $request->merge(['polygon_points' => $polygonPoints]);
            }

            // Select statement untuk FOBI
            $fobiData = $fobiData->select(
                'fobi_checklists.id',
                'fobi_checklists.latitude',
                'fobi_checklists.longitude',
                'fobi_checklist_faunasv1.fauna_id',
                'fobi_checklist_faunasv1.count',
                'fobi_checklist_faunasv1.notes',
                'data_quality_assessments.grade',
                'data_quality_assessments.has_media',
                'fobi_users.uname as observer_name',
                'fobi_users.id as observer_id',
                'second_faunas.nameId',
                'second_faunas.nameLat',
                'second_faunas.family',
                DB::raw("'fobi' as source"),
                'fobi_checklists.tgl_pengamatan as observation_date',
                'fobi_checklists.created_at'
            )->get();

            // Query untuk data Burungnesia dengan filter yang sama
            $burungnesiaData = DB::connection('second')->table('checklists')
                ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                ->join('users', 'checklists.user_id', '=', 'users.id');

            // Terapkan filter pencarian untuk Burungnesia
            if ($searchQuery) {
                $burungnesiaData->where(function($query) use ($searchQuery) {
                    $query->where('faunas.nameId', 'LIKE', "%{$searchQuery}%")
                        ->orWhere('faunas.nameLat', 'LIKE', "%{$searchQuery}%")
                        ->orWhere('faunas.family', 'LIKE', "%{$searchQuery}%");
                });
            }

            // Terapkan filter tanggal untuk Burungnesia
            if ($startDate) {
                $burungnesiaData->where('checklists.tgl_pengamatan', '>=', $startDate);
            }
            if ($endDate) {
                $burungnesiaData->where('checklists.tgl_pengamatan', '<=', $endDate);
            }

            // Terapkan filter lokasi untuk Burungnesia
            if ($latitude && $longitude) {
                $haversine = "(6371 * acos(cos(radians($latitude))
                             * cos(radians(checklists.latitude))
                             * cos(radians(checklists.longitude)
                             - radians($longitude))
                             + sin(radians($latitude))
                             * sin(radians(checklists.latitude))))";

                $burungnesiaData->whereRaw("{$haversine} <= ?", [$radius]);
            }

            // Lakukan hal yang sama untuk burungnesiaData
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
                
                $burungnesiaData->where('checklists.latitude', '>=', $minLat)
                               ->where('checklists.latitude', '<=', $maxLat)
                               ->where('checklists.longitude', '>=', $minLng)
                               ->where('checklists.longitude', '<=', $maxLng);
            }

            // Select statement untuk Burungnesia
            $burungnesiaData = $burungnesiaData->select(
                'checklists.id',
                'checklists.latitude',
                'checklists.longitude',
                'checklist_fauna.fauna_id',
                'checklist_fauna.count',
                'checklist_fauna.notes',
                DB::raw("'checklist burungnesia' as grade"),
                DB::raw('0 as has_media'),
                'users.uname as observer_name',
                'faunas.nameId',
                'faunas.nameLat',
                'faunas.family',
                DB::raw("'burungnesia' as source"),
                'checklists.tgl_pengamatan as observation_date',
                'checklists.created_at'
            )->get();

            // Gabungkan dan proses data seperti sebelumnya
            $allData = $fobiData->concat($burungnesiaData)
                ->sortByDesc('created_at');

            $total = $allData->count();
            $items = $allData->forPage($page, $perPage);

            // Proses data gambar dan count
            foreach ($items as $observation) {
                if ($observation->source === 'fobi') {
                    $observation->images = DB::table('fobi_checklist_fauna_imgs')
                        ->where('checklist_id', $observation->id)
                        ->where('fauna_id', $observation->fauna_id)
                        ->select('id', 'images as url')
                        ->get();
                } else {
                    $observation->images = collect([]);
                }

                // Hitung total untuk masing-masing sumber
                $observation->fobi_count = DB::table('fobi_checklist_faunasv1')
                    ->where('fauna_id', $observation->fauna_id)
                    ->count();

                $observation->burungnesia_count = DB::connection('second')
                    ->table('checklist_fauna')
                    ->where('fauna_id', $observation->fauna_id)
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
                    'burungnesia_count' => $burungnesiaData->count(),
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
            $perPage = $request->input('per_page', 10);
            $secondDb = DB::connection('second');

            $observations = DB::table('fobi_checklists')
                ->join('fobi_checklist_faunasv1', 'fobi_checklists.id', '=', 'fobi_checklist_faunasv1.checklist_id')
                ->join('data_quality_assessments', function($join) {
                    $join->on('fobi_checklists.id', '=', 'data_quality_assessments.observation_id')
                         ->on('fobi_checklist_faunasv1.fauna_id', '=', 'data_quality_assessments.fauna_id');
                })
                ->join('fobi_users', 'fobi_checklists.fobi_user_id', '=', 'fobi_users.id')
                ->joinSub(
                    $secondDb->table('faunas')->select('id', 'nameId', 'nameLat', 'family'),
                    'second_faunas',
                    function($join) {
                        $join->on('fobi_checklist_faunasv1.fauna_id', '=', 'second_faunas.id');
                    }
                )
                ->where('fobi_checklists.fobi_user_id', $userId)
                ->select(
                    'fobi_checklists.*',
                    'fobi_checklist_faunasv1.fauna_id',
                    'fobi_checklist_faunasv1.count',
                    'fobi_checklist_faunasv1.notes',
                    'data_quality_assessments.grade',
                    'data_quality_assessments.has_media',
                    'data_quality_assessments.is_wild',
                    'data_quality_assessments.location_accurate',
                    'data_quality_assessments.needs_id',
                    'data_quality_assessments.community_id_level',
                    'fobi_users.uname as observer_name',
                    'fobi_users.id as observer_id',
                    'second_faunas.nameId',
                    'second_faunas.nameLat',
                    'second_faunas.family',
                    DB::raw('(SELECT COUNT(DISTINCT user_id) FROM community_identifications WHERE observation_id = fobi_checklists.id AND observation_type = "burungnesia") as identifications_count')
                )
                ->orderBy('fobi_checklists.created_at', 'desc')
                ->paginate($perPage);

            // Tambahkan data gambar untuk setiap observasi
            foreach ($observations as $observation) {
                $observation->images = DB::table('fobi_checklist_fauna_imgs')
                    ->where('checklist_id', $observation->id)
                    ->where('fauna_id', $observation->fauna_id)
                    ->select('id', 'images as url')
                    ->get();

                // Tambahkan total checklist
                $observation->fobi_count = DB::table('fobi_checklist_faunasv1')
                    ->where('fauna_id', $observation->fauna_id)
                    ->count();

                $observation->burungnesia_count = DB::connection('second')
                    ->table('checklist_fauna')
                    ->where('fauna_id', $observation->fauna_id)
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
                FROM fobi_checklists fc
                JOIN fobi_users fu ON fc.fobi_user_id = fu.id
                LEFT JOIN data_quality_assessments dqa ON fc.id = dqa.observation_id
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
                FROM fobi_checklist_faunasv1 cf
                JOIN " . DB::connection('second')->getDatabaseName() . ".faunas f ON cf.fauna_id = f.id
                WHERE cf.checklist_id = ?
            ", [$id]);

            // Perbaiki query media
            $medias = DB::select("
                SELECT
                    id,
                    'image' as type,
                    images as url
                FROM fobi_checklist_fauna_imgs
                WHERE checklist_id = ?
                UNION
                SELECT
                    id,
                    'audio' as type,
                    audio_url as url
                FROM fobi_checklist_audio
                WHERE checklist_id = ?
            ", [$id, $id]);

            // Transform URL
            foreach ($medias as $media) {
                if (!filter_var($media->url, FILTER_VALIDATE_URL)) {
                    $media->url = asset('storage/' . $media->url);
                }
            }

            // Tambahkan spectrogram jika ada
            $spectrograms = DB::select("
                SELECT spectrogram_url
                FROM fobi_checklist_audio
                WHERE checklist_id = ? AND spectrogram_url IS NOT NULL
            ", [$id]);

            if (!empty($spectrograms)) {
                $checklist['spectrogram_url'] = asset('storage/' . $spectrograms[0]->spectrogram_url);
            }

            // Ambil identifikasi
            $identifications = DB::select("
                SELECT
                    ci.*,
                    u.uname as identifier_name,
                    u.created_at as identifier_joined_date,
                    (SELECT COUNT(*) FROM burungnesia_identifications WHERE user_id = u.id) as identifier_identification_count,
                    (SELECT COUNT(*) FROM burungnesia_identifications WHERE agrees_with_id = ci.id) as agreement_count,
                    (SELECT COUNT(*) > 0 FROM burungnesia_identifications WHERE agrees_with_id = ci.id AND user_id = ?) as user_agreed
                FROM burungnesia_identifications ci
                JOIN fobi_users u ON ci.user_id = u.id
                WHERE ci.observation_id = ? AND ci.observation_type = 'burungnesia'
            ", [$userId, $id]);

            // Ambil verifikasi lokasi
            $locationVerifications = DB::select("
                SELECT *
                FROM location_verifications
                WHERE observation_id = ? AND observation_type = 'burungnesia'
            ", [$id]);

            // Ambil wild status votes
            $wildStatusVotes = DB::select("
                SELECT *
                FROM wild_status_votes
                WHERE observation_id = ? AND observation_type = 'burungnesia'
            ", [$id]);

            // Gabungkan semua data
            $checklist = (array) $baseChecklist;
            $checklist['faunas'] = $faunas;

            return response()->json([
                'success' => true,
                'data' => [
                    'checklist' => $checklist,
                    'medias' => $medias,
                    'identifications' => $identifications,
                    'location_verifications' => $locationVerifications,
                    'wild_status_votes' => $wildStatusVotes
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching checklist detail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil detail checklist: ' . $e->getMessage()
            ], 500);
        }
    }
}
