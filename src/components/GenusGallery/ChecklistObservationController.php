<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\Api\ChecklistQualityAssessmentController;
use Illuminate\Validation\Rule;

class ChecklistObservationController extends Controller
{

    protected $qualityAssessmentController;

    public function __construct(ChecklistQualityAssessmentController $qualityAssessmentController)
    {
        $this->qualityAssessmentController = $qualityAssessmentController;
    }

    public function getObservationDetail($id)
    {
        try {
            $source = request()->query('source', $this->determineSource($id));
            $userId = JWTAuth::user()->id;
            $actualId = $this->getActualId($id, $source);

            // Get quality assessment
            $assessmentConfig = $this->qualityAssessmentController->getAssessmentConfig($source);
            $assessment = DB::table($assessmentConfig['table'])
                ->where($assessmentConfig['id_column'], $actualId)
                ->first();

            // Get checklist details
            $checklistConfig = $this->getChecklistConfig($source);

            // Build query based on source
            if ($source === 'burungnesia') {
                $checklist = DB::table('fobi_checklists as c')
                    ->join('fobi_checklist_faunasv1 as f', 'c.id', '=', 'f.checklist_id')
                    ->leftJoin('taxas as t', 'f.fauna_id', '=', 't.burnes_fauna_id')
                    ->leftJoin('faunas', 'f.fauna_id', '=', 'faunas.id')
                    ->leftJoin('data_quality_assessments as qa', function($join) {
                        $join->on('f.fauna_id', '=', 'qa.fauna_id')
                             ->where('qa.observation_id', DB::raw('c.id'));
                    })
                    ->leftJoin('fobi_users as u', 'c.fobi_user_id', '=', 'u.id')
                    ->select([
                        'c.id',
                        'c.fobi_user_id',
                        'f.fauna_id',
                        'c.latitude',
                        'c.longitude',
                        'c.location_details',
                        'u.uname as observer',
                        'c.additional_note as notes',
                        'c.tgl_pengamatan as observation_date',
                        DB::raw('COALESCE(t.cname_species, faunas.nameId) as common_name'),
                        't.kingdom',
                        't.phylum',
                        't.class',
                        't.order',
                        DB::raw('COALESCE(t.family, faunas.family) as family'),
                        't.genus',
                        't.species',
                        't.subspecies',
                        't.variety',
                        DB::raw('COALESCE(t.scientific_name, faunas.nameLat) as scientific_name'),
                        'qa.grade',
                        DB::raw('CASE WHEN qa.grade = "research grade" THEN t.iucn_red_list_category ELSE NULL END as iucn_status'),
                        'c.created_at',
                        'c.updated_at',
                        't.id as taxa_id'
                    ])
                    ->where('c.id', $actualId)
                    ->first();

                // Get media
                if ($checklist) {
                    $media = [
                        'images' => DB::table('fobi_checklist_fauna_imgs')
                            ->where('checklist_id', $actualId)
                            ->get(),
                        'sounds' => DB::table('fobi_checklist_sounds')
                            ->where('checklist_id', $actualId)
                            ->get()
                    ];

                    // Attach media to checklist
                    $checklist->media = $media;
                }
            } elseif ($source === 'kupunesia') {
                $checklist = DB::table('fobi_checklists_kupnes as c')
                    ->join('fobi_checklist_faunasv2 as f', 'c.id', '=', 'f.checklist_id')
                    ->leftJoin('taxas as t', 'f.fauna_id', '=', 't.kupnes_fauna_id')
                    ->leftJoin('faunas_kupnes', 'f.fauna_id', '=', 'faunas_kupnes.id')
                    ->leftJoin('data_quality_assessments_kupnes as qa', function($join) {
                        $join->on('f.fauna_id', '=', 'qa.fauna_id')
                             ->where('qa.observation_id', DB::raw('c.id'));
                    })
                    ->leftJoin('fobi_users as u', 'c.fobi_user_id', '=', 'u.id')
                    ->select([
                        'c.id',
                        'c.fobi_user_id',
                        'f.fauna_id',
                        'c.latitude',
                        'c.longitude',
                        'c.location_details',
                        'u.uname as observer',
                        'c.additional_note as notes',
                        'c.tgl_pengamatan as observation_date',
                        DB::raw('COALESCE(t.cname_species, faunas_kupnes.nameId) as common_name'),
                        't.kingdom',
                        't.phylum',
                        't.class',
                        't.order',
                        DB::raw('COALESCE(t.family, faunas_kupnes.family) as family'),
                        't.genus',
                        't.species',
                        't.subspecies',
                        't.variety',
                        DB::raw('COALESCE(t.scientific_name, faunas_kupnes.nameLat) as scientific_name'),
                        'qa.grade',
                        DB::raw('CASE WHEN qa.grade = "research grade" THEN t.iucn_red_list_category ELSE NULL END as iucn_status'),
                        'c.created_at',
                        'c.updated_at',
                        't.id as taxa_id'
                    ])
                    ->where('c.id', $actualId)
                    ->first();

                // Get media untuk Kupunesia (hanya gambar)
                if ($checklist) {
                    $media = [
                        'images' => DB::table('fobi_checklist_fauna_imgs_kupnes')
                            ->where('checklist_id', $actualId)
                            ->select([
                                'id',
                                'images',
                                'checklist_id',
                                'created_at',
                                'updated_at'
                            ])
                            ->get()
                    ];

                    // Attach media to checklist
                    $checklist->media = $media;
                }
            } else {
                // Query untuk FOBI
                $checklist = DB::table('fobi_checklist_taxas as c')
                    ->leftJoin('taxas as t', 'c.taxa_id', '=', 't.id')
                    ->leftJoin('taxa_quality_assessments as qa', 'c.id', '=', 'qa.taxa_id')
                    ->leftJoin('fobi_users as u', 'c.user_id', '=', 'u.id')
                    ->select([
                        'c.id',
                        'c.user_id',
                        'c.taxa_id as fauna_id',
                        'c.latitude',
                        'c.longitude',
                        'c.observation_details as location_details',
                        'u.uname as observer',
                        'c.date as observation_date',
                        't.scientific_name',
                        't.kingdom',
                        't.phylum',
                        't.class',
                        't.order',
                        't.family',
                        't.genus',
                        't.species',
                        't.subspecies',
                        't.variety',
                        't.cname_species as common_name',
                        'qa.grade',
                        DB::raw('CASE WHEN qa.grade = "research grade" THEN t.iucn_red_list_category ELSE NULL END as iucn_status'),
                        'c.created_at',
                        'c.updated_at',
                        't.id as taxa_id'
                    ])
                    ->where('c.id', $actualId)
                    ->first();

                // Get media untuk FOBI
                if ($checklist) {
                    $media = [
                        'images' => DB::table('fobi_checklist_media')
                            ->where('checklist_id', $actualId)
                            ->where('media_type', 'photo')
                            ->select([
                                'id',
                                DB::raw("CONCAT('".config('app.url')."', '/storage/', file_path) as images"),
                                'checklist_id',
                                'created_at',
                                'updated_at'
                            ])
                            ->get(),
                        'sounds' => DB::table('fobi_checklist_media')
                            ->where('checklist_id', $actualId)
                            ->where('media_type', 'audio')
                            ->select([
                                'id',
                                DB::raw("CONCAT('".config('app.url')."', '/storage/', spectrogram) as spectrogram_url"),
                                DB::raw("CONCAT('".config('app.url')."', '/storage/', file_path) as url"),
                                'checklist_id',
                                'created_at',
                                'updated_at'
                            ])
                            ->get()
                    ];

                    // Attach media ke checklist
                    $checklist->media = $media;
                }
            }

            // Log untuk debugging
            Log::info('Checklist found', ['checklist' => $checklist]);

            // Get identifications dengan parameter yang benar
            $identifications = DB::table('taxa_identifications as i')
                ->join('fobi_users as u', 'i.user_id', '=', 'u.id')
                ->leftJoin('taxas as t', 'i.taxon_id', '=', 't.id')
                ->where(function($query) use ($actualId, $source) {
                    if ($source === 'burungnesia') {
                        $query->where('i.burnes_checklist_id', $actualId);
                    } elseif ($source === 'kupunesia') {
                        $query->where('i.kupnes_checklist_id', $actualId);
                    } else {
                        $query->where('i.checklist_id', $actualId);
                    }
                })
                ->select(
                    'i.*',
                    'u.uname as identifier_name',
                    't.scientific_name',
                    't.kingdom',
                    't.phylum',
                    't.class',
                    't.order',
                    't.family',
                    't.genus',
                    't.species',
                    't.subspecies',
                    't.cname_species as common_name',
                    't.variety',
                    // Tambahkan common name untuk setiap level taksonomi
                    't.cname_kingdom',
                    't.cname_phylum',
                    't.cname_class',
                    't.cname_order',
                    't.cname_family',
                    't.cname_genus',
                    't.cname_species',
                    't.cname_subspecies',
                    't.cname_variety',
                    DB::raw("CASE
                        WHEN (SELECT COUNT(*) FROM taxa_identifications WHERE agrees_with_id = i.id) = 0
                        THEN ''
                        ELSE CAST((SELECT COUNT(*) FROM taxa_identifications WHERE agrees_with_id = i.id) AS CHAR)
                    END as agreement_count"),
                    DB::raw('CASE
                        WHEN EXISTS(SELECT 1 FROM taxa_identifications WHERE agrees_with_id = i.id AND user_id = ?)
                        THEN true
                        ELSE NULL
                    END as user_agreed')
                )
                ->addBinding($userId, 'select')
                ->get();

            // Format response
            if ($checklist) {
                $formattedChecklist = [
                    'id' => $checklist->id,
                    'user_id' => $checklist->fobi_user_id ?? $checklist->user_id ?? null,
                    'fauna_id' => $checklist->fauna_id,
                    'latitude' => $checklist->latitude ? (float)$checklist->latitude : null,
                    'longitude' => $checklist->longitude ? (float)$checklist->longitude : null,
                    'location_details' => $checklist->location_details ?? $checklist->observation_details ?? null,
                    'observer' => $checklist->observer ?? 'Pengamat tidak diketahui',
                    'notes' => $checklist->notes ?? null,
                    'observation_date' => $checklist->observation_date ?? $checklist->created_at,
                    'scientific_name' => $checklist->scientific_name ?? 'Nama tidak tersedia',
                    'kingdom' => $checklist->kingdom ?? null,
                    'phylum' => $checklist->phylum ?? null,
                    'class' => $checklist->class ?? null,
                    'order' => $checklist->order ?? null,
                    'family' => $checklist->family ?? null,
                    'genus' => $checklist->genus ?? null,
                    'species' => $checklist->species ?? null,
                    'subspecies' => $checklist->subspecies ?? null,
                    'variety' => $checklist->variety ?? null,
                    'common_name' => $checklist->common_name ?? null,
                    // Tambahkan common name untuk semua level taksonomi
                    'cname_kingdom' => $checklist->cname_kingdom ?? null,
                    'cname_phylum' => $checklist->cname_phylum ?? null,
                    'cname_class' => $checklist->cname_class ?? null,
                    'cname_order' => $checklist->cname_order ?? null,
                    'cname_family' => $checklist->cname_family ?? null,
                    'cname_genus' => $checklist->cname_genus ?? null,
                    'cname_species' => $checklist->cname_species ?? null,
                    'cname_subspecies' => $checklist->cname_subspecies ?? null,
                    'cname_variety' => $checklist->cname_variety ?? null,
                    'grade' => $checklist->grade ?? 'casual',
                    'iucn_status' => $checklist->iucn_status,
                    'created_at' => $checklist->created_at,
                    'updated_at' => $checklist->updated_at,
                    'media' => $checklist->media ?? ['images' => [], 'sounds' => []],
                    'taxa_id' => $checklist->taxa_id ?? null
                ];

                return response()->json([
                    'success' => true,
                    'data' => [
                        'checklist' => $formattedChecklist,
                        'identifications' => $identifications ?? [],
                        'media' => $checklist->media ?? ['images' => [], 'sounds' => []],
                        'quality_assessment' => $assessment
                    ]
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error in getObservationDetail: ' . $e->getMessage(), [
                'id' => $id,
                'source' => $source ?? 'unknown',
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil detail observasi'
            ], 500);
        }
    }

    private function determineSource($id)
    {
        if (str_starts_with($id, 'BN')) return 'burungnesia';
        if (str_starts_with($id, 'KP')) return 'kupunesia';
        return 'fobi';
    }

    private function getChecklistTable($source)
    {
        return match($source) {
            'burungnesia' => 'fobi_checklists',
            'kupunesia' => 'fobi_checklists_kupnes',
            default => 'fobi_checklist_taxas'
        };
    }

    private function getMediaTables($source)
    {
        return match($source) {
            'burungnesia' => [
                'images' => 'fobi_checklist_fauna_imgs',
                'sounds' => 'fobi_checklist_sounds'
            ],
            'kupunesia' => [
                'images' => 'fobi_checklist_fauna_imgs_kupnes'
            ],
            default => [
                'images' => 'fobi_checklist_media'
            ]
        };
    }

    private function getTaxaTables($source)
    {
        return match($source) {
            'burungnesia' => [
                'primary' => 'taxas',
                'fallback' => 'faunas'
            ],
            'kupunesia' => [
                'primary' => 'taxas',
                'fallback' => 'faunas_kupnes'
            ],
            default => [
                'primary' => 'taxas'
            ]
        };
    }

    private function getAssessmentTable($source)
    {
        return match($source) {
            'burungnesia' => 'data_quality_assessments',
            'kupunesia' => 'data_quality_assessments_kupnes',
            default => 'taxa_quality_assessments'
        };
    }

    private function getFobiObservation($id)
    {
        return DB::table('fobi_checklist_taxas as fct')
            ->join('fobi_users as fu', 'fct.user_id', '=', 'fu.id')
            ->join('taxas as t', 'fct.taxa_id', '=', 't.id')
            ->where('fct.id', $id)
            ->select(
                'fct.*',
                'fu.uname as observer_name',
                't.scientific_name',
                't.class',
                't.order',
                't.family',
                't.genus',
                't.species',
                // Tambahkan common name untuk setiap level taksonomi
                't.cname_kingdom',
                't.cname_phylum',
                't.cname_class',
                't.cname_order',
                't.cname_family',
                't.cname_genus',
                't.cname_species',
                't.cname_subspecies',
                't.cname_variety'
            )
            ->first();
    }

    private function getBurungnesiaObservation($id)
    {
        return DB::table('fobi_checklists as fc')
            ->join('fobi_checklist_faunasv1 as fcf', 'fc.id', '=', 'fcf.checklist_id')
            ->join('fobi_users as fu', 'fc.fobi_user_id', '=', 'fu.id')
            ->where('fc.id', $id)
            ->select(
                'fc.*',
                'fcf.fauna_id',
                'fcf.count',
                'fcf.notes',
                'fu.uname as observer_name'
            )
            ->first();
    }

    private function getKupunesiaObservation($id)
    {
        return DB::table('fobi_checklists_kupnes as fck')
            ->join('fobi_checklist_faunasv2 as fcf', 'fck.id', '=', 'fcf.checklist_id')
            ->join('fobi_users as fu', 'fck.fobi_user_id', '=', 'fu.id')
            ->where('fck.id', $id)
            ->select(
                'fck.*',
                'fcf.fauna_id',
                'fcf.count',
                'fcf.notes',
                'fu.uname as observer_name'
            )
            ->first();
    }

    public function addIdentification(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'taxon_id' => 'required|exists:taxas,id',
                'burnes_fauna_id' => 'nullable|integer',
                'kupnes_fauna_id' => 'nullable|integer',
                'comment' => 'nullable|string|max:500',
                'photo' => 'nullable|image|max:5120'
            ]);

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);

            // Cek apakah user sudah pernah membuat identifikasi sebelumnya
            $previousIdentification = DB::table('taxa_identifications')
                ->where('user_id', $userId)
                ->where(function($query) use ($actualId, $source) {
                    if ($source === 'burungnesia') {
                        $query->where('burnes_checklist_id', $actualId);
                    } elseif ($source === 'kupunesia') {
                        $query->where('kupnes_checklist_id', $actualId);
                    } else {
                        $query->where('checklist_id', $actualId);
                    }
                })
                ->whereNull('agrees_with_id') // Hanya cek identifikasi langsung, bukan agreement
                ->whereNull('deleted_at')
                ->first();

            // Jika ada identifikasi sebelumnya, soft delete dan withdraw
            if ($previousIdentification) {
                DB::table('taxa_identifications')
                    ->where('id', $previousIdentification->id)
                    ->update([
                        'deleted_at' => now(),
                        'is_withdrawn' => true
                    ]);

                // Hapus semua agreement yang terkait dengan identifikasi sebelumnya
                DB::table('taxa_identifications')
                    ->where('agrees_with_id', $previousIdentification->id)
                    ->update([
                        'deleted_at' => now(),
                        'is_withdrawn' => true,
                        'agrees_with_id' => null
                    ]);
            }

            // Cek dan tarik semua persetujuan yang pernah dibuat oleh user ini
            $userAgreements = DB::table('taxa_identifications')
                ->where('user_id', $userId)
                ->where(function($query) use ($actualId, $source) {
                    if ($source === 'burungnesia') {
                        $query->where('burnes_checklist_id', $actualId);
                    } elseif ($source === 'kupunesia') {
                        $query->where('kupnes_checklist_id', $actualId);
                    } else {
                        $query->where('checklist_id', $actualId);
                    }
                })
                ->whereNotNull('agrees_with_id') // Hanya ambil persetujuan
                ->whereNull('deleted_at')
                ->get();

            // Withdraw semua persetujuan yang ada
            foreach ($userAgreements as $agreement) {
                DB::table('taxa_identifications')
                    ->where('id', $agreement->id)
                    ->update([
                        'deleted_at' => now(),
                        'is_withdrawn' => true,
                        'agrees_with_id' => null
                    ]);
            }

            // Handle photo upload
            $photoPath = null;
            if ($request->hasFile('photo')) {
                $photo = $request->file('photo');
                $filename = time() . '_' . $photo->getClientOriginalName();
                $path = $photo->storeAs(
                    'identification_photos/' . $source,
                    $filename,
                    'public'
                );
                $photoPath = $path;
            }

            // Ambil data taxa
            $taxaQuery = DB::table('taxas')->where('id', $request->taxon_id);
            if ($source === 'burungnesia') {
                $taxaQuery->whereNotNull('burnes_fauna_id');
                $faunaId = 'burnes_fauna_id';
            } elseif ($source === 'kupunesia') {
                $taxaQuery->whereNotNull('kupnes_fauna_id');
                $faunaId = 'kupnes_fauna_id';
            } else {
                $faunaId = null;
            }

            if ($faunaId) {
                $taxon = $taxaQuery->select('taxon_rank', $faunaId)->first();
            } else {
                $taxon = $taxaQuery->select('taxon_rank')->first();
            }

            if (!$taxon) {
                throw new \Exception('Taxa tidak valid untuk sumber data ini');
            }

            // Base identification data
            $identificationData = [
                'user_id' => $userId,
                'taxon_id' => $request->taxon_id,
                'comment' => $request->comment,
                'identification_level' => strtoupper($taxon->taxon_rank),
                'photo_path' => $photoPath,
                'created_at' => now(),
                'updated_at' => now(),
                'checklist_id' => null,
                'burnes_checklist_id' => null,
                'kupnes_checklist_id' => null,
                'burnes_fauna_id' => null,
                'kupnes_fauna_id' => null
            ];

            // Set values based on source
            if ($source === 'burungnesia') {
                $identificationData['burnes_checklist_id'] = $actualId;
                $identificationData['burnes_fauna_id'] = $taxon->burnes_fauna_id;
            } elseif ($source === 'kupunesia') {
                $identificationData['kupnes_checklist_id'] = $actualId;
                $identificationData['kupnes_fauna_id'] = $taxon->kupnes_fauna_id;
            } else {
                $identificationData['checklist_id'] = $actualId;
            }

            $identificationId = DB::table('taxa_identifications')->insertGetId($identificationData);

            // Update quality assessment
            $this->qualityAssessmentController->updateQualityAssessment($actualId, $source);

            // Buat notifikasi
            $checklistOwner = $this->getChecklistOwner($actualId, $source);
            if ($checklistOwner && $checklistOwner->id !== $userId) {
                $this->createNotification(
                    $checklistOwner->id,
                    $actualId,
                    'new_identification',
                    "Seseorang telah menambahkan identifikasi baru pada pengamatan Anda"
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Identifikasi berhasil ditambahkan',
                'data' => [
                    'identification_id' => $identificationId,
                    'previous_withdrawn' => $previousIdentification ? true : false
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error submitting identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function agreeWithIdentification(Request $request, $id, $identificationId)
    {
        try {
            DB::beginTransaction();

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);

            // Cek apakah identifikasi ada
            $identification = DB::table('taxa_identifications')
                ->where('id', $identificationId)
                ->first();

            if (!$identification) {
                throw new \Exception('Identifikasi tidak ditemukan');
            }

            // Cek dan withdraw identifikasi sebelumnya dari user
            $previousIdentification = DB::table('taxa_identifications')
                ->where('user_id', $userId)
                ->where(function($query) use ($actualId, $source) {
                    if ($source === 'burungnesia') {
                        $query->where('burnes_checklist_id', $actualId);
                    } elseif ($source === 'kupunesia') {
                        $query->where('kupnes_checklist_id', $actualId);
                    } else {
                        $query->where('checklist_id', $actualId);
                    }
                })
                ->whereNull('agrees_with_id') // Hanya cek identifikasi langsung, bukan agreement
                ->whereNull('deleted_at')
                ->first();

            // Jika ada identifikasi sebelumnya, soft delete dan withdraw
            if ($previousIdentification) {
                DB::table('taxa_identifications')
                    ->where('id', $previousIdentification->id)
                    ->update([
                        'deleted_at' => now(),
                        'is_withdrawn' => true
                    ]);

                // Hapus semua agreement yang terkait dengan identifikasi sebelumnya
                DB::table('taxa_identifications')
                    ->where('agrees_with_id', $previousIdentification->id)
                    ->update([
                        'deleted_at' => now(),
                        'is_withdrawn' => true,
                        'agrees_with_id' => null
                    ]);
            }

            // Cek apakah user sudah pernah setuju
            $existingAgreementQuery = DB::table('taxa_identifications')
                ->where('user_id', $userId)
                ->where('agrees_with_id', $identificationId);

            // Sesuaikan where clause berdasarkan source
            if ($source === 'burungnesia') {
                $existingAgreementQuery->where('burnes_checklist_id', $actualId);
            } elseif ($source === 'kupunesia') {
                $existingAgreementQuery->where('kupnes_checklist_id', $actualId);
            } else {
                $existingAgreementQuery->where('checklist_id', $actualId);
            }

            $existingAgreement = $existingAgreementQuery->first();

            if ($existingAgreement) {
                throw new \Exception('Anda sudah menyetujui identifikasi ini');
            }

            // Siapkan data persetujuan
            $agreementData = [
                'user_id' => $userId,
                'taxon_id' => $identification->taxon_id,
                'burnes_fauna_id' => $identification->burnes_fauna_id,
                'kupnes_fauna_id' => $identification->kupnes_fauna_id,
                'agrees_with_id' => $identificationId,
                'created_at' => now(),
                'updated_at' => now(),
                'checklist_id' => null,
                'burnes_checklist_id' => null,
                'kupnes_checklist_id' => null,
                'identification_level' => $identification->identification_level
            ];

            // Set ID yang sesuai berdasarkan source
            if ($source === 'burungnesia') {
                $agreementData['burnes_checklist_id'] = $actualId;
            } elseif ($source === 'kupunesia') {
                $agreementData['kupnes_checklist_id'] = $actualId;
            } else {
                $agreementData['checklist_id'] = $actualId;
            }

            // Simpan persetujuan
            DB::table('taxa_identifications')->insert($agreementData);

            // Hitung jumlah persetujuan
            $agreementCount = DB::table('taxa_identifications')
                ->where('agrees_with_id', $identificationId)
                ->count();

            // Update quality assessment dengan actual ID
            $this->qualityAssessmentController->updateQualityAssessment($actualId, $source);

            // Ambil data identification owner
            $identificationOwner = DB::table('taxa_identifications as ti')
                ->join('fobi_users as fu', 'ti.user_id', '=', 'fu.id')
                ->where('ti.id', $identificationId)
                ->select('fu.id')
                ->first();

            // Buat notifikasi untuk pemilik identifikasi
            if ($identificationOwner && $identificationOwner->id !== $userId) {
                $this->createNotification(
                    $identificationOwner->id,
                    $actualId,
                    'agree_identification',
                    "Seseorang menyetujui identifikasi Anda"
                );
            }

            DB::commit();

            // Ambil data identifikasi yang diperbarui
            $updatedIdentification = DB::table('taxa_identifications as ti')
                ->join('fobi_users as fu', 'ti.user_id', '=', 'fu.id')
                ->join('taxas as t', 'ti.taxon_id', '=', 't.id')
                ->where('ti.id', $identificationId)
                ->select(
                    'ti.*',
                    'fu.uname as identifier_name',
                    't.scientific_name',
                    DB::raw("CASE WHEN (SELECT COUNT(*) FROM taxa_identifications WHERE agrees_with_id = ti.id) = 0 THEN '' ELSE CAST((SELECT COUNT(*) FROM taxa_identifications WHERE agrees_with_id = ti.id) AS CHAR) END as agreement_count"),
                    DB::raw('CASE
                        WHEN EXISTS(SELECT 1 FROM taxa_identifications WHERE agrees_with_id = ti.id AND user_id = ?)
                        THEN true
                        ELSE NULL
                    END as user_agreed')
                )
                ->addBinding($userId, 'select') // Tambahkan binding untuk user_id
                ->first();

            return response()->json([
                'success' => true,
                'message' => 'Berhasil menyetujui identifikasi',
                'data' => $updatedIdentification
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in agreeWithIdentification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function withdrawIdentification(Request $request, $id, $identificationId)
    {
        try {
            DB::beginTransaction();

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);

            // Cek apakah identifikasi ada dan milik user
            $identification = DB::table('taxa_identifications')
                ->where('id', $identificationId)
                ->where('user_id', $userId)
                ->whereNull('agrees_with_id')
                ->first();

            if (!$identification) {
                throw new \Exception('Identifikasi tidak ditemukan atau bukan milik Anda');
            }

            // Update status is_withdrawn menjadi true alih-alih menghapus
            DB::table('taxa_identifications')
                ->where('id', $identificationId)
                ->update([
                    'is_withdrawn' => true,
                    'updated_at' => now()
                ]);

            // Hapus semua persetujuan untuk identifikasi ini
            DB::table('taxa_identifications')
                ->where('agrees_with_id', $identificationId)
                ->delete();

            $this->qualityAssessmentController->updateQualityAssessment($actualId, $source);

            // Ambil data checklist owner
            $checklistOwner = $this->getChecklistOwner($actualId, $source);

            // Buat notifikasi untuk pemilik checklist
            if ($checklistOwner && $checklistOwner->id !== $userId) {
                $this->createNotification(
                    $checklistOwner->id,
                    $actualId,
                    'withdraw_identification',
                    "Seseorang telah menarik identifikasi pada pengamatan Anda"
                );
            }

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
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function cancelAgreement($id, $identificationId)
    {
        try {
            DB::beginTransaction();

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);

            // Cari agreement yang sesuai
            $agreement = DB::table('taxa_identifications')
                ->where(function($query) use ($actualId, $source) {
                    if ($source === 'burungnesia') {
                        $query->where('burnes_checklist_id', $actualId);
                    } elseif ($source === 'kupunesia') {
                        $query->where('kupnes_checklist_id', $actualId);
                    } else {
                        $query->where('checklist_id', $actualId);
                    }
                })
                ->where('user_id', $userId)
                ->where('agrees_with_id', $identificationId)
                ->first();

            if (!$agreement) {
                throw new \Exception('Agreement tidak ditemukan');
            }

            // Update agreement: soft delete dan kosongkan agrees_with_id
            $updated = DB::table('taxa_identifications')
                ->where('id', $agreement->id)
                ->update([
                    'deleted_at' => now(),
                    'is_withdrawn' => true,
                    'agrees_with_id' => null  // Mengosongkan agrees_with_id
                ]);

            if (!$updated) {
                throw new \Exception('Gagal membatalkan persetujuan');
            }

            // Hitung ulang jumlah agreement yang aktif
            $agreementCount = DB::table('taxa_identifications')
                ->where('agrees_with_id', $identificationId)
                ->whereNull('deleted_at')
                ->count();

            // Ambil data identifikasi yang diperbarui
            $updatedIdentification = DB::table('taxa_identifications as ti')
                ->join('fobi_users as fu', 'ti.user_id', '=', 'fu.id')
                ->leftJoin('taxas as t', 'ti.taxon_id', '=', 't.id')
                ->where('ti.id', $identificationId)
                ->select(
                    'ti.*',
                    'fu.uname as identifier_name',
                    't.scientific_name',
                    DB::raw("$agreementCount as agreement_count"),
                    DB::raw('false as user_agreed')
                )
                ->first();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Persetujuan berhasil dibatalkan',
                'data' => [
                    'identification' => $updatedIdentification,
                    'agreement_count' => $agreementCount
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in cancelAgreement:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function disagreeWithIdentification(Request $request, $id, $identificationId)
    {
        try {
            DB::beginTransaction();

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);

            // Validasi request
            $request->validate([
                'taxon_id' => 'required|exists:taxas,id',
                'comment' => 'required|string|max:500',
                'identification_level' => 'required|string'
            ]);

            // Cek identifikasi yang akan ditolak
            $identification = DB::table('taxa_identifications')
                ->where('id', $identificationId)
                ->first();

            if (!$identification) {
                throw new \Exception('Identifikasi tidak ditemukan');
            }

            // Cek dan withdraw identifikasi sebelumnya dari user
            $previousIdentification = DB::table('taxa_identifications')
                ->where('user_id', $userId)
                ->where(function($query) use ($actualId, $source) {
                    if ($source === 'burungnesia') {
                        $query->where('burnes_checklist_id', $actualId);
                    } elseif ($source === 'kupunesia') {
                        $query->where('kupnes_checklist_id', $actualId);
                    } else {
                        $query->where('checklist_id', $actualId);
                    }
                })
                ->whereNull('agrees_with_id') // Hanya cek identifikasi langsung, bukan agreement
                ->whereNull('deleted_at')
                ->first();

            // Jika ada identifikasi sebelumnya, soft delete dan withdraw
            if ($previousIdentification) {
                DB::table('taxa_identifications')
                    ->where('id', $previousIdentification->id)
                    ->update([
                        'deleted_at' => now(),
                        'is_withdrawn' => true
                    ]);

                // Hapus semua agreement yang terkait dengan identifikasi sebelumnya
                DB::table('taxa_identifications')
                    ->where('agrees_with_id', $previousIdentification->id)
                    ->update([
                        'deleted_at' => now(),
                        'is_withdrawn' => true,
                        'agrees_with_id' => null
                    ]);
            }

            // Ambil data taxa
            $taxon = DB::table('taxas')
                ->where('id', $request->taxon_id)
                ->select('taxon_rank', 'burnes_fauna_id', 'kupnes_fauna_id')
                ->first();

            if (!$taxon) {
                throw new \Exception('Taxa tidak valid');
            }

            // Siapkan data disagreement
            $disagreementData = [
                'user_id' => $userId,
                'taxon_id' => $request->taxon_id,
                'comment' => $request->comment,
                'identification_level' => $request->identification_level,
                'disagrees_with_id' => $identificationId,
                'created_at' => now(),
                'updated_at' => now(),
                'checklist_id' => null,
                'burnes_checklist_id' => null,
                'kupnes_checklist_id' => null,
                'burnes_fauna_id' => $taxon->burnes_fauna_id,
                'kupnes_fauna_id' => $taxon->kupnes_fauna_id
            ];

            // Set ID yang sesuai berdasarkan source
            if ($source === 'burungnesia') {
                $disagreementData['burnes_checklist_id'] = $actualId;
            } elseif ($source === 'kupunesia') {
                $disagreementData['kupnes_checklist_id'] = $actualId;
            } else {
                $disagreementData['checklist_id'] = $actualId;
            }

            // Simpan disagreement
            DB::table('taxa_identifications')->insert($disagreementData);

            // Hitung jumlah persetujuan untuk identifikasi yang ditolak
            $agreementCount = DB::table('taxa_identifications')
                ->where('agrees_with_id', $identificationId)
                ->count();

            // Update quality assessment
            $this->qualityAssessmentController->updateQualityAssessment($actualId, $source);

            // Ambil data identification owner
            $identificationOwner = DB::table('taxa_identifications as ti')
                ->join('fobi_users as fu', 'ti.user_id', '=', 'fu.id')
                ->where('ti.id', $identificationId)
                ->select('fu.id')
                ->first();

            // Buat notifikasi untuk pemilik identifikasi
            if ($identificationOwner && $identificationOwner->id !== $userId) {
                $this->createNotification(
                    $identificationOwner->id,
                    $actualId,
                    'disagree_identification',
                    "Seseorang tidak setuju dengan identifikasi Anda"
                );
            }

            DB::commit();

            // Ambil data identifikasi yang diperbarui
            $updatedIdentification = DB::table('taxa_identifications as ti')
                ->join('fobi_users as fu', 'ti.user_id', '=', 'fu.id')
                ->join('taxas as t', 'ti.taxon_id', '=', 't.id')
                ->where('ti.id', $identificationId)
                ->select(
                    'ti.*',
                    'fu.uname as identifier_name',
                    't.scientific_name',
                    DB::raw("CASE WHEN (SELECT COUNT(*) FROM taxa_identifications WHERE agrees_with_id = ti.id) = 0 THEN '' ELSE CAST((SELECT COUNT(*) FROM taxa_identifications WHERE agrees_with_id = ti.id) AS CHAR) END as agreement_count"),
                    DB::raw('CASE
                        WHEN EXISTS(SELECT 1 FROM taxa_identifications WHERE agrees_with_id = ti.id AND user_id = ?)
                        THEN true
                        ELSE NULL
                    END as user_agreed')
                )
                ->addBinding($userId, 'select') // Tambahkan binding untuk user_id
                ->first();

            return response()->json([
                'success' => true,
                'message' => 'Penolakan identifikasi berhasil disimpan',
                'data' => $updatedIdentification
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in disagreeWithIdentification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }


    private function getObservationMedia($id, $source)
    {
        try {
            $mediaTable = match($source) {
                'fobi' => 'fobi_checklist_media',
                'burungnesia' => 'fobi_checklist_fauna_imgs',
                'kupunesia' => 'fobi_checklist_fauna_imgs_kupnes', // Sesuaikan jika berbeda
            };

            $audioTable = match($source) {
                'fobi' => 'fobi_checklist_media',
                'burungnesia' => 'fobi_checklist_sounds',
                'kupunesia' => 'fobi_checklist_sounds', // Sesuaikan jika berbeda
            };

            // Get images
            $images = DB::table($mediaTable)
                ->where('checklist_id', $id)
                ->select('id', 'file_path as url', DB::raw("'image' as type"))
                ->get();

            // Get audio
            $audio = DB::table($audioTable)
                ->where('checklist_id', $id)
                ->select(
                    'id',
                    'file_path as url',
                    'spectrogram_path',
                    DB::raw("'audio' as type")
                )
                ->get();

            // Transform URLs
            $medias = $images->concat($audio)->map(function($media) {
                $media->url = asset('storage/' . $media->url);
                if (isset($media->spectrogram_path)) {
                    $media->spectrogram = asset('storage/' . $media->spectrogram_path);
                }
                return $media;
            });

            return $medias;

        } catch (\Exception $e) {
            Log::error('Error in getObservationMedia: ' . $e->getMessage());
            throw $e;
        }
    }

    public function searchTaxa(Request $request)
    {
        try {
            $request->validate([
                'q' => 'required|string|min:2',
                'include_locations' => 'nullable|boolean'
            ]);

            $query = $request->input('q');
            $source = $request->input('source', 'fobi');
            $includeLocations = $request->input('include_locations', false);

            // Base query dengan prefix table untuk menghindari ambiguous columns
            $results = DB::table('taxas')
                ->where(function($q) use ($query) {
                    // Bersihkan query dari tanda strip
                    $cleanQuery = str_replace('-', ' ', $query);

                    $q->where(DB::raw("REPLACE(taxas.cname_species, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.species, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.scientific_name, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.genus, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.cname_genus, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.family, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.cname_family, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.order, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.cname_order, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.class, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.cname_class, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.kingdom, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.phylum, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.subphylum, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.tribe, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.cname_tribe, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.subfamily, '-', ' ')"), 'like', "%{$cleanQuery}%")
                      ->orWhere(DB::raw("REPLACE(taxas.cname_subfamily, '-', ' ')"), 'like', "%{$cleanQuery}%");
                });

            // Filter berdasarkan sumber
            if ($source === 'burungnesia') {
                $results->whereNotNull('taxas.burnes_fauna_id')
                       ->leftJoin('faunas', 'taxas.burnes_fauna_id', '=', 'faunas.id')
                       ->select(
                           'taxas.id',
                           'taxas.taxon_rank',
                           DB::raw('COALESCE(taxas.scientific_name, faunas.nameLat) as scientific_name'),
                           DB::raw('COALESCE(taxas.species, faunas.nameLat) as species'),
                           DB::raw('COALESCE(taxas.cname_species, faunas.nameId) as cname_species'),
                           DB::raw('COALESCE(taxas.genus, faunas.nameLat) as genus'),
                           DB::raw('COALESCE(taxas.cname_genus, faunas.nameLat) as cname_genus'),
                           DB::raw('COALESCE(taxas.family, faunas.nameLat) as family'),
                           DB::raw('COALESCE(taxas.cname_family, faunas.nameLat) as cname_family'),
                           'taxas.burnes_fauna_id',
                           'taxas.kupnes_fauna_id'
                       );
            } elseif ($source === 'kupunesia') {
                $results->whereNotNull('taxas.kupnes_fauna_id')
                       ->leftJoin('faunas_kupnes', 'taxas.kupnes_fauna_id', '=', 'faunas_kupnes.id')
                       ->select(
                           'taxas.id',
                           'taxas.taxon_rank',
                           DB::raw('COALESCE(taxas.scientific_name, faunas_kupnes.nameLat) as scientific_name'),
                           DB::raw('COALESCE(taxas.species, faunas_kupnes.nameLat) as species'),
                           DB::raw('COALESCE(taxas.cname_species, faunas_kupnes.nameId) as cname_species'),
                           DB::raw('COALESCE(taxas.genus, faunas_kupnes.nameLat) as genus'),
                           DB::raw('COALESCE(taxas.cname_genus, faunas_kupnes.nameLat) as cname_genus'),
                           DB::raw('COALESCE(taxas.family, faunas_kupnes.nameLat) as family'),
                           DB::raw('COALESCE(taxas.cname_family, faunas_kupnes.nameLat) as cname_family'),
                           'taxas.burnes_fauna_id',
                           'taxas.kupnes_fauna_id'
                       );
            } else {
                $results->select(
                    'taxas.id',
                    'taxas.taxon_rank',
                    'taxas.scientific_name',
                    'taxas.domain',
                    'taxas.cname_domain',
                    'taxas.superkingdom',
                    'taxas.cname_superkingdom',
                    'taxas.kingdom',
                    'taxas.cname_kingdom',
                    'taxas.subkingdom',
                    'taxas.cname_subkingdom',
                    'taxas.superphylum',
                    'taxas.cname_superphylum',
                    'taxas.phylum',
                    'taxas.cname_phylum',
                    'taxas.subphylum',
                    'taxas.cname_subphylum',
                    'taxas.superclass',
                    'taxas.cname_superclass',
                    'taxas.class',
                    'taxas.cname_class',
                    'taxas.subclass',
                    'taxas.cname_subclass',
                    'taxas.infraclass',
                    'taxas.cname_infraclass',
                    'taxas.superorder',
                    'taxas.cname_superorder',
                    'taxas.order',
                    'taxas.cname_order',
                    'taxas.suborder',
                    'taxas.cname_suborder',
                    'taxas.infraorder',
                    'taxas.superfamily',
                    'taxas.cname_superfamily',
                    'taxas.family',
                    'taxas.cname_family',
                    'taxas.subfamily',
                    'taxas.cname_subfamily',
                    'taxas.supertribe',
                    'taxas.cname_supertribe',
                    'taxas.tribe',
                    'taxas.cname_tribe',
                    'taxas.subtribe',
                    'taxas.cname_subtribe',
                    'taxas.genus',
                    'taxas.cname_genus',
                    'taxas.subgenus',
                    'taxas.cname_subgenus',
                    'taxas.species',
                    'taxas.cname_species',
                    'taxas.subspecies',
                    'taxas.cname_subspecies',
                    'taxas.variety',
                    'taxas.cname_variety',
                    'taxas.burnes_fauna_id',
                    'taxas.kupnes_fauna_id'
                );
            }

            // Order by taxonomic rank hierarchy
            $rankOrder = DB::raw("CASE taxon_rank
                WHEN 'DOMAIN' THEN 1
                WHEN 'SUPERKINGDOM' THEN 2
                WHEN 'KINGDOM' THEN 3
                WHEN 'SUBKINGDOM' THEN 4
                WHEN 'SUPERPHYLUM' THEN 5
                WHEN 'PHYLUM' THEN 6
                WHEN 'SUBPHYLUM' THEN 7
                WHEN 'SUPERCLASS' THEN 8
                WHEN 'CLASS' THEN 9
                WHEN 'SUBCLASS' THEN 10
                WHEN 'INFRACLASS' THEN 11
                WHEN 'SUPERORDER' THEN 12
                WHEN 'ORDER' THEN 13
                WHEN 'SUBORDER' THEN 14
                WHEN 'INFRAORDER' THEN 15
                WHEN 'SUPERFAMILY' THEN 16
                WHEN 'FAMILY' THEN 17
                WHEN 'SUBFAMILY' THEN 18
                WHEN 'SUPERTRIBE' THEN 19
                WHEN 'TRIBE' THEN 20
                WHEN 'SUBTRIBE' THEN 21
                WHEN 'GENUS' THEN 22
                WHEN 'SUBGENUS' THEN 23
                WHEN 'SPECIES' THEN 24
                WHEN 'SUBSPECIES' THEN 25
                WHEN 'VARIETY' THEN 26
                ELSE 27 END");

            $results = $results->orderBy($rankOrder)
                             ->limit(10)
                             ->get();

            // Format results to include rank information
            $results = $results->map(function($taxa) {
                $commonName = '';
                $scientificName = '';
                $rank = strtolower($taxa->taxon_rank);

                // Get the appropriate name based on rank
                if (isset($taxa->{$rank}) && isset($taxa->{"cname_$rank"})) {
                    $scientificName = $taxa->{$rank};
                    $commonName = $taxa->{"cname_$rank"};
                }

                // If no specific rank name found, use scientific_name
                if (empty($scientificName)) {
                    $scientificName = $taxa->scientific_name;
                }

                // Get the family name for context
                $familyContext = $taxa->family ?? null;

                        return [
                    'id' => $taxa->id,
                    'scientific_name' => $scientificName,
                    'common_name' => $commonName,
                    'rank' => $rank,
                    'family_context' => $familyContext,
                    'full_data' => $taxa // Include all data for complete context
                        ];
                    });

            return response()->json([
                'success' => true,
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Error in searchTaxa: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari taxa: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getObservations(Request $request)
    {
        try {
            $request->validate([
                'source' => 'required|in:fobi,burungnesia,kupunesia',
                'per_page' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1',
                'sort' => 'nullable|in:latest,oldest',
                'taxon_id' => 'nullable|exists:taxas,id',
                'user_id' => 'nullable|exists:fobi_users,id'
            ]);

            $perPage = $request->input('per_page', 20);
            $source = $request->input('source');
            $sort = $request->input('sort', 'latest');

            $query = match($source) {
                'fobi' => DB::table('fobi_checklist_taxas as fct')
                    ->join('fobi_users as fu', 'fct.user_id', '=', 'fu.id')
                    ->join('taxas as t', 'fct.taxa_id', '=', 't.id')
                    ->join('taxa_quality_assessments as tqa', 'fct.id', '=', 'tqa.taxa_id')
                    ->select(
                        'fct.*',
                        'fu.uname as observer_name',
                        't.scientific_name',
                        't.species',
                        't.genus',
                        't.family',
                        't.order',
                        'tqa.grade',
                        'tqa.identification_count'
                    ),

                'burungnesia' => DB::table('fobi_checklists as fc')
                    ->join('fobi_checklist_faunasv1 as fcf', 'fc.id', '=', 'fcf.checklist_id')
                    ->join('fobi_users as fu', 'fc.fobi_user_id', '=', 'fu.id')
                    ->join('data_quality_assessments as dqa', 'fc.id', '=', 'dqa.observation_id')
                    ->select(
                        'fc.*',
                        'fcf.fauna_id',
                        'fu.uname as observer_name',
                        'dqa.grade',
                        'dqa.identification_count'
                    ),

                'kupunesia' => DB::table('fobi_checklists_kupnes as fck')
                    ->join('fobi_checklist_faunasv2 as fcf', 'fck.id', '=', 'fcf.checklist_id')
                    ->join('fobi_users as fu', 'fck.fobi_user_id', '=', 'fu.id')
                    ->join('data_quality_assessments_kupnes as dqa', 'fck.id', '=', 'dqa.observation_id')
                    ->select(
                        'fck.*',
                        'fcf.fauna_id',
                        'fu.uname as observer_name',
                        'dqa.grade',
                        'dqa.identification_count'
                    )
            };

            // Apply filters
            if ($request->has('user_id')) {
                $query->where('fu.id', $request->user_id);
            }

            if ($request->has('taxon_id')) {
                $query->where('taxa_id', $request->taxon_id);
            }

            // Apply sorting
            $query->orderBy('created_at', $sort === 'latest' ? 'desc' : 'asc');

            // Get paginated results
            $observations = $query->paginate($perPage);

            // Add media to each observation
            foreach ($observations as $observation) {
                $observation->medias = $this->getObservationMedia($observation->id, $source);
            }

            return response()->json([
                'success' => true,
                'data' => $observations->items(),
                'meta' => [
                    'current_page' => $observations->currentPage(),
                    'per_page' => $observations->perPage(),
                    'total' => $observations->total(),
                    'last_page' => $observations->lastPage()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getObservations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data observasi'
            ], 500);
        }
    }

    public function getObservationStatistics(Request $request)
    {
        try {
            $request->validate([
                'source' => 'required|in:fobi,burungnesia,kupunesia',
                'period' => 'nullable|in:daily,weekly,monthly,yearly',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'user_id' => 'nullable|exists:fobi_users,id'
            ]);

            $source = $request->input('source');
            $period = $request->input('period', 'monthly');
            $startDate = $request->input('start_date', now()->subMonth());
            $endDate = $request->input('end_date', now());
            $userId = $request->input('user_id');

            // Tentukan format date berdasarkan period
            $dateFormat = match($period) {
                'daily' => '%Y-%m-%d',
                'weekly' => '%Y-%u',
                'monthly' => '%Y-%m',
                'yearly' => '%Y'
            };

            // Base query berdasarkan sumber
            $query = match($source) {
                'fobi' => DB::table('fobi_checklist_taxas')
                    ->join('taxa_quality_assessments', 'fobi_checklist_taxas.id', '=', 'taxa_quality_assessments.taxa_id'),

                'burungnesia' => DB::table('fobi_checklists')
                    ->join('data_quality_assessments', 'fobi_checklists.id', '=', 'data_quality_assessments.observation_id'),

                'kupunesia' => DB::table('fobi_checklists_kupnes')
                    ->join('data_quality_assessments_kupnes', 'fobi_checklists_kupnes.id', '=', 'data_quality_assessments_kupnes.observation_id')
            };

            // Filter berdasarkan tanggal dan user
            $query->whereBetween('created_at', [$startDate, $endDate]);
            if ($userId) {
                $query->where($source === 'fobi' ? 'user_id' : 'fobi_user_id', $userId);
            }

            // Statistik dasar
            $basicStats = $query->select([
                DB::raw('COUNT(*) as total_observations'),
                DB::raw('COUNT(DISTINCT ' . ($source === 'fobi' ? 'user_id' : 'fobi_user_id') . ') as total_observers'),
                DB::raw("COUNT(CASE WHEN grade = 'research grade' THEN 1 END) as research_grade_count"),
                DB::raw("COUNT(CASE WHEN grade = 'needs ID' THEN 1 END) as needs_id_count"),
                DB::raw('AVG(identification_count) as avg_identifications')
            ])->first();

            // Trend observasi berdasarkan periode
            $trends = $query->select([
                DB::raw("DATE_FORMAT(created_at, '$dateFormat') as period"),
                DB::raw('COUNT(*) as count'),
                DB::raw("COUNT(CASE WHEN grade = 'research grade' THEN 1 END) as research_grade_count")
            ])
            ->groupBy('period')
            ->orderBy('period')
            ->get();

            // Top taxa/species
            $topTaxa = match($source) {
                'fobi' => DB::table('fobi_checklist_taxas')
                    ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
                    ->select('taxas.scientific_name', DB::raw('COUNT(*) as count'))
                    ->groupBy('taxa_id', 'scientific_name')
                    ->orderByDesc('count')
                    ->limit(10)
                    ->get(),

                'burungnesia' => DB::table('fobi_checklists')
                    ->join('fobi_checklist_faunasv1', 'fobi_checklists.id', '=', 'fobi_checklist_faunasv1.checklist_id')
                    ->join('taxas', 'fobi_checklist_faunasv1.fauna_id', '=', 'taxas.burnes_fauna_id')
                    ->select('taxas.scientific_name', DB::raw('COUNT(*) as count'))
                    ->groupBy('fauna_id', 'scientific_name')
                    ->orderByDesc('count')
                    ->limit(10)
                    ->get(),

                'kupunesia' => DB::table('fobi_checklists_kupnes')
                    ->join('fobi_checklist_faunasv2', 'fobi_checklists_kupnes.id', '=', 'fobi_checklist_faunasv2.checklist_id')
                    ->join('taxas', 'fobi_checklist_faunasv2.fauna_id', '=', 'taxas.kupnes_fauna_id')
                    ->select('taxas.scientific_name', DB::raw('COUNT(*) as count'))
                    ->groupBy('fauna_id', 'scientific_name')
                    ->orderByDesc('count')
                    ->limit(10)
                    ->get()
            };

            return response()->json([
                'success' => true,
                'data' => [
                    'basic_stats' => $basicStats,
                    'trends' => $trends,
                    'top_taxa' => $topTaxa
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getObservationStatistics: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil statistik observasi'
            ], 500);
        }
    }

    public function getComments($id)
    {
        try {
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id, $source);

            // Tentukan kolom ID yang sesuai
            $idColumn = match($source) {
                'burungnesia' => 'burnes_checklist_id',
                'kupunesia' => 'kupnes_checklist_id',
                default => 'observation_id'
            };

            // Buat query berdasarkan source dan ID
            $query = DB::table('observation_comments as c')
                ->join('fobi_users as u', 'c.user_id', '=', 'u.id')
                ->where("c.$idColumn", $actualId)
                ->select(
                    'c.id',
                    'c.comment',
                    'c.created_at',
                    'c.updated_at',
                    'u.uname as user_name',
                    'c.user_id', // Pastikan user_id selalu diselect
                    'c.deleted_at'
                )
                ->whereNull('c.deleted_at')
                ->orderBy('c.created_at', 'desc');

            $comments = $query->get();

            // Log untuk debugging
            Log::info('Comments retrieved:', [
                'id' => $id,
                'actualId' => $actualId,
                'source' => $source,
                'comments' => $comments
            ]);

            return response()->json([
                'success' => true,
                'data' => $comments
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting comments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil komentar'
            ], 500);
        }
    }

    // Method untuk menambah komentar
    public function addComment(Request $request, $id)
    {
        try {
            $request->validate([
                'comment' => 'required|string|max:1000'
            ]);

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id, $source);

            // Tentukan kolom ID yang sesuai
            $idColumn = match($source) {
                'burungnesia' => 'burnes_checklist_id',
                'kupunesia' => 'kupnes_checklist_id',
                default => 'observation_id'
            };

            // Siapkan data komentar
            $commentData = [
                'user_id' => $userId,
                'comment' => $request->comment,
                'source' => $source,
                $idColumn => $actualId,
                'created_at' => now(),
                'updated_at' => now()
            ];

            // Insert komentar dan dapatkan ID-nya
            $commentId = DB::table('observation_comments')->insertGetId($commentData);

            // Ambil data komentar yang baru dibuat
            $comment = DB::table('observation_comments as c')
                ->join('fobi_users as u', 'c.user_id', '=', 'u.id')
                ->where('c.id', $commentId)
                ->select(
                    'c.id',
                    'c.comment',
                    'c.created_at',
                    'c.updated_at',
                    'u.uname as user_name',
                    'c.user_id'
                )
                ->first();

            return response()->json([
                'success' => true,
                'data' => $comment,
                'message' => 'Komentar berhasil ditambahkan'
            ]);

        } catch (\Exception $e) {
            Log::error('Error adding comment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan komentar'
            ], 500);
        }
    }

    public function getRelatedLocations($taxaId)
    {
        try {
            $source = $this->determineSource($taxaId);

            // Tentukan tabel yang akan digunakan berdasarkan sumber
            $checklistTable = $this->getChecklistTable($source);
            $assessmentTable = match($source) {
                'burungnesia' => 'burnes_quality_assessments',
                'kupunesia' => 'kupnes_quality_assessments',
                default => 'taxa_quality_assessments'
            };

            // Query untuk mendapatkan lokasi terkait
            $relatedLocations = DB::table("$checklistTable as c")
                ->leftJoin("$assessmentTable as qa", 'c.id', '=', 'qa.taxa_id')
                ->where('c.taxa_id', $taxaId)
                ->select(
                    'c.id',
                    'c.latitude',
                    'c.longitude',
                    'c.scientific_name',
                    'c.created_at',
                    DB::raw('COALESCE(qa.grade, "needs ID") as grade')
                )
                ->whereNotNull('c.latitude')
                ->whereNotNull('c.longitude')
                ->get();

            // Format response
            $formattedLocations = $relatedLocations->map(function($location) {
                return [
                    'id' => $location->id,
                    'latitude' => (float)$location->latitude,
                    'longitude' => (float)$location->longitude,
                    'scientific_name' => $location->scientific_name,
                    'created_at' => $location->created_at,
                    'grade' => $location->grade
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedLocations
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting related locations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil lokasi terkait'
            ], 500);
        }
    }

    private function getChecklistConfig($source)
    {
        return match($source) {
            'burungnesia' => [
                'table' => 'fobi_checklists',
                'fauna_table' => 'fobi_checklist_faunasv1',
                'id_column' => 'id',
                'columns' => [
                    'fobi_checklists.id',
                    'fobi_checklist_faunasv1.fauna_id as taxa_id',
                    'fobi_checklists.latitude',
                    'fobi_checklists.longitude',
                    'fobi_checklists.location_details',
                    'fobi_checklists.observer',
                    'fobi_checklists.additional_note as notes',
                    'fobi_checklists.tgl_pengamatan as observation_date',
                    'fobi_checklists.created_at',
                    'fobi_checklists.updated_at'
                ]
            ],
            'kupunesia' => [
                'table' => 'fobi_checklists_kupnes',
                'fauna_table' => 'fobi_checklist_faunasv2',
                'id_column' => 'id',
                'columns' => [
                    'fobi_checklists_kupnes.id',
                    'fobi_checklist_faunasv2.fauna_id as taxa_id',
                    'fobi_checklists_kupnes.latitude',
                    'fobi_checklists_kupnes.longitude',
                    'fobi_checklists_kupnes.location_details',
                    'fobi_checklists_kupnes.observer',
                    'fobi_checklists_kupnes.additional_note as notes',
                    'fobi_checklists_kupnes.tgl_pengamatan as observation_date',
                    'fobi_checklists_kupnes.created_at',
                    'fobi_checklists_kupnes.updated_at'
                ]
            ],
            default => [
                'table' => 'fobi_checklist_taxas',
                'id_column' => 'id',
                'columns' => ['*']
            ]
        };
    }

    private function getMediaForChecklist($checklistId, $source)
    {
        $media = [];

        try {
            if ($source === 'burungnesia') {
                $images = DB::table('fobi_checklist_fauna_imgs')
                    ->where('checklist_id', $checklistId)
                    ->get();
                $sounds = DB::table('fobi_checklist_sounds')
                    ->where('checklist_id', $checklistId)
                    ->get();

                $media['images'] = $images;
                $media['sounds'] = $sounds;
            }
            elseif ($source === 'kupunesia') {
                $images = DB::table('fobi_checklist_fauna_imgs_kupnes')
                    ->where('checklist_id', $checklistId)
                    ->get();

                $media['images'] = $images;
            }
            else {
                $media['images'] = DB::table('fobi_checklist_media')
                    ->where('checklist_id', $checklistId)
                    ->get();
            }
        } catch (\Exception $e) {
            Log::error('Error getting media: ' . $e->getMessage(), [
                'checklist_id' => $checklistId,
                'source' => $source
            ]);
            // Return empty arrays if there's an error
            $media['images'] = [];
            if ($source === 'burungnesia') {
                $media['sounds'] = [];
            }
        }

        return $media;
    }

    private function getActualId($id, $source = null)
    {
        if (is_numeric($id)) {
            return (int)$id;
        }

        if (!$source) {
            $source = $this->determineSource($id);
        }

        return match($source) {
            'burungnesia' => (int)substr($id, 2), // Remove 'BN' prefix
            'kupunesia' => (int)substr($id, 2),   // Remove 'KP' prefix
            default => (int)$id
        };
    }

    private function getTaxaInfo($taxaId, $source)
    {
        // Coba cari di tabel taxas dulu
        $taxaInfo = DB::table('taxas')
            ->where('id', $taxaId)
            ->first();

        // Jika tidak ditemukan, cek di tabel alternatif sesuai source
        if (!$taxaInfo) {
            $table = match($source) {
                'burungnesia' => 'faunas',
                'kupunesia' => 'faunas_kupnes',
                default => null
            };

            if ($table) {
                $taxaInfo = DB::table($table)
                    ->where('id', $taxaId)
                    ->first();
            }
        }

        return $taxaInfo;
    }

    private function getIdentificationsWithPhotos($id, $source = null)
    {
        if (!$source) {
            $source = $this->determineSource($id);
        }
        $actualId = $this->getActualId($id);
        $userId = optional(JWTAuth::user())->id;

        $query = DB::table('taxa_identifications as i')
            ->join('fobi_users as u', 'i.user_id', '=', 'u.id')
            ->leftJoin('taxas as t', 'i.taxon_id', '=', 't.id')
            ->select([
                'i.*',
                'u.uname as identifier_name',
                't.family',
                't.order',
                't.class',
                't.genus',
                't.species',
                't.subspecies',
                't.variety',
                't.form',
                't.subform',
                't.cname_species as common_name',
                't.scientific_name',

                DB::raw("CASE
                    WHEN i.photo_path IS NOT NULL
                    THEN CONCAT('" . config('app.url') . "/storage/', i.photo_path)
                    ELSE NULL
                END as photo_url"),
                'i.photo_path'
            ]);

        // Sesuaikan where clause berdasarkan sumber
        if ($source === 'burungnesia') {
            $query->where('i.burnes_checklist_id', $actualId);
        } elseif ($source === 'kupunesia') {
            $query->where('i.kupnes_checklist_id', $actualId);
        } else {
            $query->where('i.checklist_id', $actualId);
        }

        // Tambahkan perhitungan agreement_count dan user_agreed
        $query->addSelect(DB::raw('(SELECT COUNT(*) FROM taxa_identifications WHERE agrees_with_id = i.id) as agreement_count'));
        $query->addSelect(DB::raw('CASE
            WHEN EXISTS(SELECT 1 FROM taxa_identifications WHERE agrees_with_id = i.id AND user_id = ?)
            THEN true
            ELSE NULL
        END as user_agreed'))
            ->addBinding($userId, 'select');

        $identifications = $query->orderBy('i.created_at', 'desc')->get();

        // Transform hasil query untuk memastikan URL foto benar
        return $identifications->map(function($identification) {
            // Convert object to array
            $identification = (array) $identification;

            // Pastikan URL foto benar
            if (!empty($identification['photo_path'])) {
                $identification['photo_url'] = config('app.url') . '/storage/' . $identification['photo_path'];
            } else {
                $identification['photo_url'] = null;
            }

            return $identification;
        });
    }

    public function getNeedsIdObservations(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $sort = $request->input('sort', 'latest');

            // Query untuk FOBI
            $fobiQuery = DB::table('fobi_checklist_taxas as fct')
                ->join('fobi_users as fu', 'fct.user_id', '=', 'fu.id')
                ->leftJoin('taxa_quality_assessments as tqa', function($join) {
                    $join->on('fct.id', '=', 'tqa.observation_id')
                         ->where('tqa.type', '=', 'fobi');
                })
                ->leftJoin('taxas as t', 'fct.taxa_id', '=', 't.id')
                ->where(function($query) {
                    $query->where('tqa.grade', 'needs id')
                          ->orWhere('tqa.grade', 'low quality id');
                })
                ->select([
                    'fct.*',
                    'fu.uname as observer_name',
                    't.scientific_name',
                    't.kingdom',
                    't.phylum',
                    't.class',
                    't.order',
                    'tqa.grade',
                    'tqa.identification_count'
                ]);

            // Query untuk Burungnesia
            $burungnesiaQuery = DB::table('fobi_checklists as fc')
                ->join('fobi_checklist_faunasv1 as fcf', 'fc.id', '=', 'fcf.checklist_id')
                ->join('fobi_users as fu', 'fc.fobi_user_id', '=', 'fu.id')
                ->join('data_quality_assessments as dqa', 'fc.id', '=', 'dqa.observation_id')
                ->leftJoin('faunas as f', 'fcf.fauna_id', '=', 'f.id')
                ->where(function($query) {
                    $query->where('dqa.grade', 'needs id')
                          ->orWhere('dqa.grade', 'low quality id');
                })
                ->select([
                    DB::raw("CONCAT('BN', fc.id) as id"),
                    'fcf.fauna_id',
                    'fu.uname as observer_name',
                    'dqa.grade',
                    'fc.created_at',
                    DB::raw("'bird' as type"),
                    DB::raw("'burungnesia' as source"),
                    'f.nameLat as title',
                    'f.description',
                    DB::raw("CASE WHEN dqa.identification_count = 0 THEN '' ELSE dqa.identification_count END as identifications_count"),
                    DB::raw('(SELECT JSON_ARRAYAGG(fci.url) FROM fobi_checklist_fauna_imgs fci WHERE fci.checklist_id = fc.id) as images')
                ]);

            // Query untuk Kupunesia
            $kupunesiaQuery = DB::table('fobi_checklists_kupnes as fck')
                ->join('fobi_checklist_faunasv2 as fcf', 'fck.id', '=', 'fcf.checklist_id')
                ->join('fobi_users as fu', 'fck.fobi_user_id', '=', 'fu.id')
                ->join('data_quality_assessments_kupnes as dqa', 'fck.id', '=', 'dqa.observation_id')
                ->leftJoin('faunas_kupnes as fk', 'fcf.fauna_id', '=', 'fk.id')
                ->where(function($query) {
                    $query->where('dqa.grade', 'needs id')
                          ->orWhere('dqa.grade', 'low quality id');
                })
                ->select([
                    DB::raw("CONCAT('KP', fck.id) as id"),
                    'fcf.fauna_id',
                    'fu.uname as observer_name',
                    'dqa.grade',
                    'fck.created_at',
                    DB::raw("'butterfly' as type"),
                    DB::raw("'kupunesia' as source"),
                    'fk.nameLat as title',
                    'fk.description',
                    DB::raw("CASE WHEN dqa.identification_count = 0 THEN '' ELSE dqa.identification_count END as identifications_count"),
                    DB::raw('(SELECT JSON_ARRAYAGG(fci.url) FROM fobi_checklist_fauna_imgs_kupnes fci WHERE fci.checklist_id = fck.id) as images')
                ]);

            // Gabungkan semua query
            $query = $fobiQuery
                ->union($burungnesiaQuery)
                ->union($kupunesiaQuery);

            // Tambahkan sorting dan pagination
            $observations = DB::query()
                ->fromSub($query, 'combined_observations')
                ->orderBy('created_at', $sort === 'latest' ? 'desc' : 'asc')
                ->paginate($perPage);

            // Format data untuk response
            $formattedObservations = collect($observations->items())->map(function($item) {
                return [
                    'id' => $item->id,
                    'fauna_id' => $item->fauna_id,
                    'observer' => $item->observer_name,
                    'title' => $item->title ?? 'Tidak ada nama',
                    'description' => $item->description ?? '',
                    'type' => $item->type,
                    'source' => $item->source,
                    'created_at' => $item->created_at,
                    'images' => json_decode($item->images) ?? [],
                    'quality' => [
                        'grade' => strtolower($item->grade),
                        'has_media' => !empty(json_decode($item->images)),
                        'needs_id' => strtolower($item->grade) === 'needs id',
                        'is_wild' => true,
                        'location_accurate' => true
                    ],
                    'identifications_count' => $item->identifications_count ? (string)$item->identifications_count : ''
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedObservations,
                'meta' => [
                    'current_page' => $observations->currentPage(),
                    'per_page' => $observations->perPage(),
                    'total' => $observations->total(),
                    'last_page' => $observations->lastPage(),
                    'has_more' => $observations->hasMorePages()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getNeedsIdObservations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data observasi'
            ], 500);
        }
    }

    /**
     * Menambahkan flag/laporan untuk sebuah checklist
     */
    public function addFlag(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'flag_type' => [
                    'required',
                    Rule::in(['identification', 'location', 'media', 'date', 'other'])
                ],
                'reason' => 'required|string|max:1000'
            ]);

            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);
            $userId = JWTAuth::user()->id;

            // Tentukan kolom ID berdasarkan source untuk taxa_flags
            $flagIdColumn = match($source) {
                'burungnesia' => 'burnes_checklist_id',
                'kupunesia' => 'kupnes_checklist_id',
                default => 'checklist_id'
            };

            // Tentukan tabel dan kolom ID untuk quality assessment
            $assessmentConfig = match($source) {
                'burungnesia' => [
                    'table' => 'data_quality_assessments',
                    'id_column' => 'observation_id'  // Sesuaikan dengan nama kolom yang benar
                ],
                'kupunesia' => [
                    'table' => 'data_quality_assessments_kupnes',
                    'id_column' => 'observation_id'  // Sesuaikan dengan nama kolom yang benar
                ],
                default => [
                    'table' => 'taxa_quality_assessments',
                    'id_column' => 'taxa_id'
                ]
            };

            // Cek flag yang sudah ada
            $existingFlag = DB::table('taxa_flags')
                ->where($flagIdColumn, $actualId)
                ->where('user_id', $userId)
                ->where('is_resolved', false)
                ->first();

            if ($existingFlag) {
                throw new \Exception('Anda sudah melaporkan checklist ini dan laporan masih dalam proses');
            }

            // Siapkan data flag
            $flagData = [
                $flagIdColumn => $actualId,
                'user_id' => $userId,
                'flag_type' => $request->flag_type,
                'reason' => $request->reason,
                'created_at' => now(),
                'updated_at' => now()
            ];

            // Simpan flag baru
            $flagId = DB::table('taxa_flags')->insertGetId($flagData);

            // Update quality assessment
            DB::table($assessmentConfig['table'])
                ->where($assessmentConfig['id_column'], $actualId)
                ->update([
                    'has_flags' => true,
                    'updated_at' => now()
                ]);

            Log::info('Flag added to checklist', [
                'source' => $source,
                'checklist_id' => $actualId,
                'flag_id' => $flagId,
                'user_id' => $userId,
                'flag_type' => $request->flag_type,
                'assessment_table' => $assessmentConfig['table'],
                'assessment_id_column' => $assessmentConfig['id_column']
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Laporan berhasil ditambahkan',
                'data' => [
                    'flag_id' => $flagId
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error adding flag: ' . $e->getMessage(), [
                'source' => $source ?? 'unknown',
                'id' => $id,
                'actual_id' => $actualId ?? null
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mengambil daftar flag untuk sebuah checklist
     */
    public function getFlags($id)
    {
        try {
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);

            $flags = DB::table('taxa_flags as tf')
                ->join('fobi_users as fu', 'tf.user_id', '=', 'fu.id')
                ->leftJoin('fobi_users as resolver', 'tf.resolved_by', '=', 'resolver.id')
                ->where('tf.checklist_id', $actualId)
                ->select(
                    'tf.*',
                    'fu.uname as reporter_name',
                    'resolver.uname as resolver_name'
                )
                ->orderBy('tf.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $flags
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting flags: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data laporan'
            ], 500);
        }
    }

    /**
     * Menyelesaikan/resolve sebuah flag
     */
    public function resolveFlag(Request $request, $id, $flagId)
    {
        try {
            DB::beginTransaction();

            $request->validate([
                'resolution_notes' => 'required|string|max:1000'
            ]);

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id);

            // Update flag
            $updated = DB::table('taxa_flags')
                ->where('id', $flagId)
                ->where('checklist_id', $actualId)
                ->update([
                    'is_resolved' => true,
                    'resolution_notes' => $request->resolution_notes,
                    'resolved_by' => $userId,
                    'resolved_at' => now(),
                    'updated_at' => now()
                ]);

            if (!$updated) {
                throw new \Exception('Flag tidak ditemukan');
            }

            // Cek apakah masih ada flag aktif
            $activeFlags = DB::table('taxa_flags')
                ->where('checklist_id', $actualId)
                ->where('is_resolved', false)
                ->exists();

            // Update quality assessment jika tidak ada flag aktif
            if (!$activeFlags) {
                DB::table('taxa_quality_assessments')
                    ->where('taxa_id', $actualId)
                    ->update([
                        'has_flags' => false,
                        'updated_at' => now()
                    ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Flag berhasil diselesaikan'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error resolving flag: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function createNotification($userId, $checklistId, $type, $message)
    {
        DB::table('taxa_notifications')->insert([
            'user_id' => $userId,
            'checklist_id' => $checklistId,
            'type' => $type,
            'message' => $message,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    // Tambahkan method helper untuk mendapatkan pemilik checklist
    private function getChecklistOwner($id, $source)
    {
        $query = match($source) {
            'burungnesia' => DB::table('fobi_checklists as fc')
                ->join('fobi_users as fu', 'fc.fobi_user_id', '=', 'fu.id')
                ->where('fc.id', $id),
            'kupunesia' => DB::table('fobi_checklists_kupnes as fck')
                ->join('fobi_users as fu', 'fck.fobi_user_id', '=', 'fu.id')
                ->where('fck.id', $id),
            default => DB::table('fobi_checklist_taxas as fct')
                ->join('fobi_users as fu', 'fct.user_id', '=', 'fu.id')
                ->where('fct.id', $id)
        };

        return $query->select('fu.id')->first();
    }

    public function deleteComment($id, $commentId)
    {
        try {
            DB::beginTransaction();
            
            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id, $source);

            // Tentukan kolom ID yang sesuai berdasarkan source
            $idColumn = match($source) {
                'burungnesia' => 'burnes_checklist_id',
                'kupunesia' => 'kupnes_checklist_id',
                default => 'observation_id'
            };

            // Cek apakah user memiliki izin
            $isAdmin = DB::table('fobi_users')
                ->where('id', $userId)
                ->whereIn('level', [3, 4])
                ->exists();

            // Cek kepemilikan komentar dan checklist
            $comment = DB::table('observation_comments as c')
                ->leftJoin('fobi_checklist_taxas as fct', 'c.observation_id', '=', 'fct.id')
                ->leftJoin('fobi_checklists as fc', 'c.burnes_checklist_id', '=', 'fc.id')
                ->leftJoin('fobi_checklists_kupnes as fck', 'c.kupnes_checklist_id', '=', 'fck.id')
                ->where('c.id', $commentId)
                ->where("c.$idColumn", $actualId)
                ->whereNull('c.deleted_at')
                ->select(
                    'c.*',
                    'fct.user_id as fobi_owner_id',
                    'fc.fobi_user_id as burnes_owner_id',
                    'fck.fobi_user_id as kupnes_owner_id'
                )
                ->first();

            if (!$comment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Komentar tidak ditemukan atau sudah dihapus'
                ], 404);
            }

            // Cek apakah user adalah pemilik komentar atau admin atau pemilik checklist
            $isOwner = $comment->user_id === $userId;
            $isChecklistOwner = match($source) {
                'burungnesia' => $comment->burnes_owner_id === $userId,
                'kupunesia' => $comment->kupnes_owner_id === $userId,
                default => $comment->fobi_owner_id === $userId
            };

            if (!$isAdmin && !$isOwner && !$isChecklistOwner) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk menghapus komentar ini'
                ], 403);
            }

            // Soft delete komentar
            $updated = DB::table('observation_comments')
                ->where('id', $commentId)
                ->where($idColumn, $actualId)
                ->whereNull('deleted_at')
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now()
                ]);

            if (!$updated) {
                throw new \Exception('Gagal menghapus komentar');
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Komentar berhasil dihapus',
                'data' => [
                    'id' => $commentId,
                    'deleted_at' => now()
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting comment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menghapus komentar'
            ], 500);
        }
    }

    public function flagComment($id, $commentId, Request $request)
    {
        try {
            $request->validate([
                'reason' => 'required|string|max:1000'
            ]);

            $userId = JWTAuth::user()->id;
            $source = $this->determineSource($id);
            $actualId = $this->getActualId($id, $source);

            // Insert ke taxa_flags dengan flag_type 'comment'
            DB::table('taxa_flags')->insert([
                'checklist_id' => $source === 'fobi' ? $actualId : null,
                'burnes_checklist_id' => $source === 'burungnesia' ? $actualId : null,
                'kupnes_checklist_id' => $source === 'kupunesia' ? $actualId : null,
                'user_id' => $userId,
                'flag_type' => 'other', // atau tambahkan enum 'comment' di database
                'reason' => "Comment ID: {$commentId} - " . $request->reason,
                'is_resolved' => false,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Komentar berhasil dilaporkan'
            ]);

        } catch (\Exception $e) {
            Log::error('Error flagging comment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat melaporkan komentar'
            ], 500);
        }
    }
}
