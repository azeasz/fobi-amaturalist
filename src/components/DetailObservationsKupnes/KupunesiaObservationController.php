<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;

class KupunesiaObservationController extends Controller
{
    public function show($id)
    {
        try {
            $userId = auth()->id();

            // Ambil data checklist dasar
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
                    dqa.community_id_level,
                    t.scientific_name,
                    t.cname_species as common_name,
                    t.class,
                    t.order,
                    t.family,
                    t.genus,
                    t.species,
                    t.iucn_red_list_category as iucn_status
                FROM fobi_checklists_kupnes fc
                JOIN fobi_users fu ON fc.fobi_user_id = fu.id
                LEFT JOIN data_quality_assessments_kupnes dqa ON fc.id = dqa.observation_id
                LEFT JOIN fobi_checklist_faunasv2 fcf ON fc.id = fcf.checklist_id
                LEFT JOIN taxas t ON fcf.fauna_id = t.kupnes_fauna_id
                WHERE fc.id = ?
            ", [$id]);

            if (empty($baseChecklist)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Checklist tidak ditemukan'
                ], 404);
            }

            $baseChecklist = $baseChecklist[0];

            // Ambil media (foto)
            $medias = DB::select("
                SELECT
                    id,
                    images as url,
                    'image' as type
                FROM fobi_checklist_fauna_imgs_kupnes
                WHERE checklist_id = ?
            ", [$id]);

            // Format media
            $formattedMedias = array_map(function($media) {
                return [
                    'id' => $media->id,
                    'type' => $media->type,
                    'url' => $media->url
                ];
            }, $medias);

            // Ambil identifikasi
            $identifications = DB::select("
                SELECT
                    ki.*,
                    u.id as user_id,
                    u.uname as identifier_name,
                    u.created_at as identifier_joined_date,
                    COALESCE(t.scientific_name, f.nameLat) as scientific_name,
                    COALESCE(t.cname_species, f.nameId) as common_name,
                    t.taxon_rank,
                    ki.taxon_id,
                    ki.photo_path,
                    (SELECT COUNT(*) FROM kupunesia_identifications WHERE user_id = u.id) as identifier_identification_count,
                    (SELECT COUNT(*) FROM kupunesia_identifications WHERE agrees_with_id = ki.id) as agreement_count,
                    (SELECT COUNT(*) > 0 FROM kupunesia_identifications WHERE agrees_with_id = ki.id AND user_id = ?) as user_agreed
                FROM kupunesia_identifications ki
                JOIN fobi_users u ON ki.user_id = u.id
                LEFT JOIN taxas t ON t.kupnes_fauna_id = ki.taxon_id
                LEFT JOIN " . DB::connection('third')->getDatabaseName() . ".faunas f ON ki.taxon_id = f.id
                WHERE ki.observation_id = ? AND ki.observation_type = 'kupunesia'
            ", [$userId, $id]);

            // Format identifikasi
            $formattedIdentifications = array_map(function($identification) {
                return [
                    'id' => $identification->id,
                    'user_id' => $identification->user_id,
                    'identifier_name' => $identification->identifier_name,
                    'created_at' => $identification->created_at,
                    'scientific_name' => $identification->scientific_name,
                    'common_name' => $identification->common_name,
                    'taxon_id' => $identification->taxon_id,
                    'photo_path' => $identification->photo_path ? asset('storage/' . $identification->photo_path) : null,
                    'taxon' => [
                        'scientific_name' => $identification->scientific_name,
                        'common_name' => $identification->common_name,
                        'taxon_rank' => $identification->taxon_rank
                    ],
                    'comment' => $identification->comment,
                    'agreement_count' => (int)$identification->agreement_count,
                    'user_agreed' => (bool)$identification->user_agreed,
                    'identifier_identification_count' => (int)$identification->identifier_identification_count,
                    'is_withdrawn' => (bool)$identification->is_withdrawn
                ];
            }, $identifications);

            // Ubah format grade sebelum mengirim response
            if ($baseChecklist) {
                $baseChecklist->quality_grade = match(strtolower($baseChecklist->quality_grade)) {
                    'research grade' => 'ID Lengkap',
                    'low quality id' => 'ID Kurang',
                    'needs id' => 'Bantu Iden',
                    'casual' => 'Casual',
                    default => 'Bantu Iden'
                };
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'checklist' => $baseChecklist,
                    'medias' => $formattedMedias,
                    'identifications' => $formattedIdentifications
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in KupunesiaObservationController@show: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil detail checklist'
            ], 500);
        }
    }

    public function searchSpecies(Request $request)
    {
        try {
            $query = $request->get('q');

            if (strlen($query) < 3) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }

            // Join tabel faunas dan taxas untuk mendapatkan data lengkap
            $species = DB::table('faunas_kupnes as f')
                ->leftJoin('taxas as t', 'f.id', '=', 't.kupnes_fauna_id')
                ->where(function($q) use ($query) {
                    $q->where('f.nameLat', 'LIKE', "%{$query}%")
                      ->orWhere('f.nameId', 'LIKE', "%{$query}%")
                      ->orWhere('t.scientific_name', 'LIKE', "%{$query}%")
                      ->orWhere('t.cname_species', 'LIKE', "%{$query}%");
                })
                ->select(
                    'f.id',
                    'f.nameLat',
                    'f.nameId',
                    't.scientific_name',
                    't.cname_species',
                    't.family',
                    't.genus',
                    't.species',
                    't.iucn_red_list_category as iucn_status'
                )
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $species
            ]);

        } catch (\Exception $e) {
            Log::error('Error searching species: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari data spesies'
            ], 500);
        }
    }

    public function addIdentification(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'fauna_id' => 'required|exists:faunas_kupnes,id',
                'comment' => 'nullable|string|max:500',
                'photo' => 'nullable|image|max:5120',
                'identification_level' => 'required|string'
            ]);

            // Cek apakah fauna sudah memiliki data di taxas
            $taxa = DB::table('taxas')
                ->where('kupnes_fauna_id', $request->fauna_id)
                ->first();

            if (!$taxa) {
                // Jika belum ada, ambil data dari faunas dan buat record baru di taxas
                $fauna = DB::table('faunas_kupnes')->find($request->fauna_id);

                $taxaId = DB::table('taxas')->insertGetId([
                    'kupnes_fauna_id' => $fauna->id,
                    'scientific_name' => $fauna->nameLat,
                    'cname_species' => $fauna->nameId,
                    // ... tambahkan field lain yang diperlukan
                ]);
            }

            $photoPath = null;
            if ($request->hasFile('photo')) {
                $photoPath = $request->file('photo')->store('kupunesia-identifications', 'public');
            }

            // Insert identifikasi baru sebagai main identification
            $identificationId = DB::table('kupunesia_identifications')->insertGetId([
                'observation_id' => $id,
                'user_id' => auth()->id(),
                'taxon_id' => $request->fauna_id,
                'identification_level' => $request->identification_level,
                'notes' => $request->comment,
                'photo_path' => $photoPath,
                'agreement_count' => 0,
                'is_valid' => 1,
                'observation_type' => 'kupunesia',
                'comment' => $request->comment,
                'is_main' => true, // Set sebagai identifikasi utama
                'is_first' => 1,
                'is_withdrawn' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Ambil data identifikasi yang baru dibuat
            $identification = DB::select("
                SELECT
                    ki.*,
                    u.uname as identifier_name,
                    COALESCE(t.scientific_name, f.nameLat) as scientific_name,
                    COALESCE(t.cname_species, f.nameId) as common_name
                FROM kupunesia_identifications ki
                JOIN fobi_users u ON ki.user_id = u.id
                LEFT JOIN taxas t ON t.kupnes_fauna_id = ki.taxon_id
                LEFT JOIN " . DB::connection('third')->getDatabaseName() . ".faunas f ON ki.taxon_id = f.id
                WHERE ki.id = ?
            ", [$identificationId])[0];

            // Cek initial quality
            $qualityController = app(KupunesiaQualityAssessmentController::class);
            $qualityController->checkInitialQuality($id);

            // Update status identifikasi
            $qualityController->updateIdentificationStatus($id);

            // Evaluasi grade
            $qualityController->evaluateQuality($id);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Identifikasi berhasil ditambahkan',
                'data' => $identification
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in addIdentification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan identifikasi'
            ], 500);
        }
    }

    public function agreeWithIdentification($observationId, $identificationId)
    {
        try {
            DB::beginTransaction();

            // Cek apakah ini identifikasi utama
            $mainIdentification = DB::table('kupunesia_identifications')
                ->where('id', $identificationId)
                ->where('is_main', true)
                ->first();

            if (!$mainIdentification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya dapat menyetujui identifikasi utama'
                ], 400);
            }

            // Insert sebagai sub-identifikasi
            DB::table('kupunesia_identifications')->insert([
                'observation_id' => $observationId,
                'user_id' => auth()->id(),
                'agrees_with_id' => $identificationId,
                'taxon_id' => $mainIdentification->taxon_id,
                'identification_level' => $mainIdentification->identification_level,
                'is_agreed' => true,
                'is_main' => false, // Set sebagai sub-identifikasi
                'observation_type' => 'kupunesia',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Update agreement count pada identifikasi utama
            DB::table('kupunesia_identifications')
                ->where('id', $identificationId)
                ->increment('agreement_count');

            // Evaluasi quality
            app(KupunesiaQualityAssessmentController::class)
                ->evaluateQuality($observationId);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Berhasil menyetujui identifikasi'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in agreeWithIdentification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan'
            ], 500);
        }
    }

    public function cancelAgreement($observationId, $identificationId)
    {
        try {
            DB::beginTransaction();

            // Hapus agreement
            $deleted = DB::table('kupunesia_identifications')
                ->where('observation_id', $observationId)
                ->where('user_id', auth()->id())
                ->where('agrees_with_id', $identificationId)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Agreement tidak ditemukan'
                ], 404);
            }

            // Update agreement count
            DB::table('kupunesia_identifications')
                ->where('id', $identificationId)
                ->decrement('agreement_count');

            // Evaluasi quality
            app(KupunesiaQualityAssessmentController::class)
                ->evaluateQuality($observationId);

            // Update status identifikasi
            app(KupunesiaQualityAssessmentController::class)
                ->updateIdentificationStatus($observationId);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Berhasil membatalkan persetujuan'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in cancelAgreement: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membatalkan persetujuan'
            ], 500);
        }
    }

    public function withdrawIdentification($observationId, $identificationId)
    {
        try {
            DB::beginTransaction();

            // Cek kepemilikan identifikasi
            $identification = DB::table('kupunesia_identifications')
                ->where('id', $identificationId)
                ->where('user_id', auth()->id())
                ->first();

            if (!$identification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Identifikasi tidak ditemukan atau bukan milik Anda'
                ], 404);
            }

            // Update status withdrawn
            DB::table('kupunesia_identifications')
                ->where('id', $identificationId)
                ->update([
                    'is_withdrawn' => 1,
                    'updated_at' => now()
                ]);

            // Hapus semua agreement untuk identifikasi ini
            DB::table('kupunesia_identifications')
                ->where('agrees_with_id', $identificationId)
                ->delete();

            // Evaluasi quality
            app(KupunesiaQualityAssessmentController::class)
                ->evaluateQuality($observationId);

            // Update status identifikasi
            app(KupunesiaQualityAssessmentController::class)
                ->updateIdentificationStatus($observationId);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Identifikasi berhasil ditarik'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in withdrawIdentification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menarik identifikasi'
            ], 500);
        }
    }

    public function disagreeWithIdentification(Request $request, $observationId, $identificationId)
    {
        try {
            $request->validate([
                'taxon_id' => 'required|exists:faunas_kupnes,id',
                'comment' => 'required|string|max:500',
                'photo' => 'nullable|image|max:5120' // Max 5MB
            ]);

            DB::beginTransaction();

            // Cek apakah identifikasi yang akan di-disagree ada
            $identification = DB::table('kupunesia_identifications')
                ->where('id', $identificationId)
                ->where('observation_id', $observationId)
                ->first();

            if (!$identification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Identifikasi tidak ditemukan'
                ], 404);
            }

            $photoPath = null;
            if ($request->hasFile('photo')) {
                $photoPath = $request->file('photo')->store('kupunesia-identifications', 'public');
            }

            // Tambah identifikasi baru dengan referensi disagree
            DB::table('kupunesia_identifications')->insert([
                'observation_id' => $observationId,
                'user_id' => auth()->id(),
                'taxon_id' => $request->taxon_id,
                'identification_level' => $request->identification_level,
                'comment' => $request->comment,
                'photo_path' => $photoPath,
                'disagrees_with_id' => $identificationId,
                'is_valid' => 1,
                'observation_type' => 'kupunesia',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Evaluasi quality
            app(KupunesiaQualityAssessmentController::class)
                ->evaluateQuality($observationId);

            // Update status identifikasi
            app(KupunesiaQualityAssessmentController::class)
                ->updateIdentificationStatus($observationId);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Berhasil menambahkan identifikasi yang berbeda'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in disagreeWithIdentification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan ketidaksetujuan'
            ], 500);
        }
    }
}
