<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaxonomyGalleryController extends Controller
{
    protected $validRanks = [
        'kingdom',
        'phylum',
        'class',
        'order',
        'family',
        'genus',
        'species'
    ];

    protected $rankOrder = [
        'kingdom' => 1,
        'phylum' => 2,
        'subphylum' => 3,
        'class' => 4,
        'subclass' => 5,
        'order' => 6,
        'suborder' => 7,
        'family' => 8,
        'subfamily' => 9,
        'genus' => 10,
        'species' => 11,
        'subspecies' => 12,
        'variety' => 13
    ];

    /**
     * Mendapatkan list taksa berdasarkan rank
     */
    public function getTaxaByRank(Request $request, $rank)
    {
        try {
            if (!in_array(strtolower($rank), $this->validRanks)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rank taksonomi tidak valid'
                ], 400);
            }

            // Subquery untuk mendapatkan jumlah taksa bawahan
            $childCountSubquery = DB::table('taxas as tc')
                ->select(
                    DB::raw("LOWER(tc.taxon_rank) as child_rank"),
                    "tc.$rank",
                    DB::raw('COUNT(DISTINCT tc.id) as child_count')
                )
                ->whereRaw("LOWER(tc.taxon_rank) != ?", [$rank])
                ->whereNotNull("tc.$rank")
                ->groupBy(DB::raw("LOWER(tc.taxon_rank)"), "tc.$rank");

            // Query utama
            $query = DB::table('taxas as t')
                ->leftJoin('fobi_checklist_taxas as fct', function($join) {
                    $join->on('fct.taxa_id', '=', 't.id')
                         ->orWhereRaw('t.burnes_fauna_id = fct.taxa_id')
                         ->orWhereRaw('t.kupnes_fauna_id = fct.taxa_id');
                })
                ->leftJoin('fobi_checklist_media as fcm', 'fct.id', '=', 'fcm.checklist_id')
                ->whereRaw("LOWER(t.taxon_rank) = ?", [$rank])
                ->select(
                    't.id as taxa_id',
                    't.'.$rank.' as name',
                    't.scientific_name',
                    "t.cname_$rank as common_name",
                    't.description',
                    DB::raw('COUNT(DISTINCT fct.id) as observation_count'),
                    DB::raw('GROUP_CONCAT(DISTINCT fcm.file_path) as media_paths')
                )
                ->groupBy(
                    't.id',
                    't.'.$rank,
                    't.scientific_name',
                    "t.cname_$rank",
                    't.description'
                );

            // Tambahkan filter pencarian
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search, $rank) {
                    $q->where('t.scientific_name', 'like', "%{$search}%")
                        ->orWhere("t.$rank", 'like', "%{$search}%")
                        ->orWhere("t.cname_$rank", 'like', "%{$search}%");
                });
            }

            $taxa = $query->paginate(12);

            // Transform data untuk menambahkan informasi child taxa
            $taxaData = $taxa->through(function ($taxon) use ($rank) {
                // Ambil data taksa bawahan
                $childTaxa = $this->getChildTaxa($taxon->name, $rank);
                $taxon->child_taxa = $childTaxa;
                
                return $taxon;
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'data' => $taxaData->items(),
                    'current_page' => $taxa->currentPage(),
                    'last_page' => $taxa->lastPage(),
                    'per_page' => $taxa->perPage(),
                    'total' => $taxa->total()
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getTaxaByRank:', [
                'rank' => $rank,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mendapatkan detail taksa berdasarkan id
     */
    public function getTaxaDetail($taxaId)
    {
        try {
            $taxon = DB::table('taxas as t')
                ->where('t.id', $taxaId)
                ->select(
                    't.id as taxa_id',
                    't.taxon_rank',
                    't.scientific_name',
                    't.description',
                    't.kingdom',
                    't.phylum', 
                    't.subphylum',
                    't.class',
                    't.subclass',
                    't.order',
                    't.suborder',
                    't.family',
                    't.subfamily',
                    't.genus',
                    't.species',
                    't.subspecies',
                    't.cname_kingdom',
                    't.cname_phylum',
                    't.cname_class',
                    't.cname_order',
                    't.cname_family',
                    't.cname_genus',
                    't.cname_species',
                    DB::raw('COALESCE(t.iucn_red_list_category, "Tidak ada data") as iucn_red_list_category')
                )
                ->first();

            if (!$taxon) {
                return response()->json([
                    'success' => false,
                    'message' => 'Taksa tidak ditemukan'
                ], 404);
            }

            // Dapatkan taksa bawahan
            $rank = strtolower($taxon->taxon_rank);
            $childTaxa = $this->getChildTaxa($taxon->{$rank}, $rank);

            // Ambil media untuk taksa ini
            $media = DB::table('fobi_checklist_taxas as fct')
                ->join('fobi_checklist_media as fcm', 'fct.id', '=', 'fcm.checklist_id')
                ->where('fct.taxa_id', $taxaId)
                ->select(
                    'fcm.id',
                    'fcm.file_path',
                    'fcm.spectrogram',
                    'fcm.habitat',
                    'fcm.location',
                    'fcm.date',
                    'fcm.description as observation_notes'
                )
                ->get();

            // Ambil lokasi pengamatan
            $locations = DB::table('fobi_checklist_taxas as fct')
                ->join('fobi_checklist_media as fcm', 'fct.id', '=', 'fcm.checklist_id')
                ->where('fct.taxa_id', $taxaId)
                ->whereNotNull('fcm.location')
                ->select(
                    DB::raw('DISTINCT fcm.location'),
                    'fcm.date as observation_date',
                    DB::raw('SUBSTRING_INDEX(fcm.location, ",", 1) as latitude'),
                    DB::raw('SUBSTRING_INDEX(fcm.location, ",", -1) as longitude')
                )
                ->get()
                ->map(function ($item) {
                    return [
                        'location' => $item->location,
                        'observation_date' => $item->observation_date,
                        'latitude' => floatval(trim($item->latitude)),
                        'longitude' => floatval(trim($item->longitude))
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'taxon' => $taxon,
                    'child_taxa' => $childTaxa,
                    'media' => $media,
                    'locations' => $locations
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getTaxaDetail:', [
                'taxa_id' => $taxaId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mendapatkan distribusi taksa
     */
    public function getTaxaDistribution($taxaId)
    {
        try {
            // Dapatkan data taksa
            $taxonData = DB::table('taxas')
                ->where('id', $taxaId)
                ->select('id', 'taxon_rank', 'scientific_name', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species')
                ->first();

            if (!$taxonData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Taksa tidak ditemukan'
                ], 404);
            }

            $rank = strtolower($taxonData->taxon_rank);
            $rankValue = $taxonData->{$rank};
            $classData = $taxonData->class;

            // Ambil semua taksa bawahan
            $childTaxa = $this->getAllChildTaxaIds($taxaId, $rank, $rankValue);

            $allLocations = collect([]);

            // 1. Query untuk data dari fobi_checklist_taxas (database lokal)
            $fobiLocations = DB::table('fobi_checklist_taxas as fct')
                ->distinct()
                ->where(function($query) use ($taxaId, $rankValue, $rank, $childTaxa) {
                    $query->where('fct.taxa_id', $taxaId)
                          ->orWhereIn('fct.taxa_id', $childTaxa->pluck('id'))
                          ->orWhere("fct.$rank", $rankValue);
                })
                ->whereNotNull('fct.latitude')
                ->whereNotNull('fct.longitude')
                ->select(
                    'fct.latitude',
                    'fct.longitude',
                    'fct.id',
                    'fct.created_at',
                    'fct.scientific_name as matched_name',
                    DB::raw("'fobi' as source")
                )
                ->get()
                ->map(function($item) {
                    return [
                        'latitude' => (float) $item->latitude,
                        'longitude' => (float) $item->longitude,
                        'id' => 'fobi_' . $item->id,
                        'created_at' => $item->created_at,
                        'source' => $item->source,
                        'matched_name' => $item->matched_name
                    ];
                });

            $allLocations = $allLocations->concat($fobiLocations);

            // Jika kelas adalah Aves (burung), coba query dari Burungnesia
            if (in_array(strtolower($classData), ['aves'])) {
                try {
                    $burungnesiaLocations = DB::connection('second')
                        ->table('checklist_fauna')
                        ->distinct()
                        ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                        ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                        ->where(function($query) use ($rankValue, $rank) {
                            if ($rank === 'species') {
                                $query->where('faunas.nameLat', 'LIKE', $rankValue . '%');
                            } elseif ($rank === 'genus') {
                                $query->where('faunas.nameLat', 'LIKE', $rankValue . ' %');
                            } else {
                                // Untuk rank tingkat tinggi, kita perlu query yang lebih kompleks
                                // Ambil semua species dalam rank tersebut dan query dengan IN
                                $query->where('faunas.nameLat', 'LIKE', '%');
                            }
                        })
                        ->whereNotNull('checklists.latitude')
                        ->whereNotNull('checklists.longitude')
                        ->whereNull('checklists.deleted_at')
                        ->select(
                            'checklists.latitude',
                            'checklists.longitude',
                            'checklists.id',
                            'checklists.created_at',
                            'faunas.nameLat as matched_name'
                        )
                        ->get()
                        ->unique('id')
                        ->map(function($item) {
                            return [
                                'latitude' => (float) $item->latitude,
                                'longitude' => (float) $item->longitude,
                                'id' => 'brn_' . $item->id,
                                'created_at' => $item->created_at,
                                'source' => 'burungnesia',
                                'matched_name' => $item->matched_name
                            ];
                        });

                    $allLocations = $allLocations->concat($burungnesiaLocations);
                } catch (\Exception $e) {
                    \Log::error('Burungnesia query error:', ['error' => $e->getMessage()]);
                }
            }

            // Jika kelas adalah Insecta/Lepidoptera (kupu-kupu), coba query dari Kupunesia
            if (in_array(strtolower($classData), ['insecta', 'lepidoptera'])) {
                try {
                    $kupunesiaLocations = DB::connection('third')
                        ->table('checklist_fauna')
                        ->distinct()
                        ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                        ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                        ->where(function($query) use ($rankValue, $rank) {
                            if ($rank === 'species') {
                                $query->where('faunas.nameLat', 'LIKE', $rankValue . '%');
                            } elseif ($rank === 'genus') {
                                $query->where('faunas.nameLat', 'LIKE', $rankValue . ' %');
                            } else {
                                // Untuk rank tingkat tinggi, kita perlu query yang lebih kompleks
                                $query->where('faunas.nameLat', 'LIKE', '%');
                            }
                        })
                        ->whereNotNull('checklists.latitude')
                        ->whereNotNull('checklists.longitude')
                        ->whereNull('checklists.deleted_at')
                        ->select(
                            'checklists.latitude',
                            'checklists.longitude',
                            'checklists.id',
                            'checklists.created_at',
                            'faunas.nameLat as matched_name'
                        )
                        ->get()
                        ->unique('id')
                        ->map(function($item) {
                            return [
                                'latitude' => (float) $item->latitude,
                                'longitude' => (float) $item->longitude,
                                'id' => 'kpn_' . $item->id,
                                'created_at' => $item->created_at,
                                'source' => 'kupunesia',
                                'matched_name' => $item->matched_name
                            ];
                        });

                    $allLocations = $allLocations->concat($kupunesiaLocations);
                } catch (\Exception $e) {
                    \Log::error('Kupunesia query error:', ['error' => $e->getMessage()]);
                }
            }

            // Pastikan semua lokasi unik
            $uniqueLocations = $allLocations->unique(function ($item) {
                return $item['latitude'] . '_' . $item['longitude'] . '_' . $item['source'];
            })->values();

            return response()->json([
                'success' => true,
                'data' => $uniqueLocations
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getTaxaDistribution:', [
                'taxa_id' => $taxaId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mendapatkan taksa serupa
     */
    public function getSimilarTaxa($taxaId)
    {
        try {
            $taxon = DB::table('taxas')
                ->where('id', $taxaId)
                ->first();

            if (!$taxon) {
                return response()->json([
                    'success' => false,
                    'message' => 'Taksa tidak ditemukan'
                ], 404);
            }

            $rank = strtolower($taxon->taxon_rank);

            // Coba ambil dari taxa_similar_identifications dulu
            $similarFromHistory = DB::table('taxa_similar_identifications as tsi')
                ->join('taxas as t', function($join) use ($taxaId) {
                    $join->on('t.id', '=', 'tsi.similar_taxa_id')
                         ->where('tsi.taxa_id', '=', $taxaId)
                         ->orOn('t.id', '=', 'tsi.taxa_id')
                         ->where('tsi.similar_taxa_id', '=', $taxaId);
                })
                ->where('t.id', '!=', $taxaId)
                ->where('t.taxon_rank', $taxon->taxon_rank)
                ->select(
                    't.id',
                    "t.$rank as name",
                    't.family',
                    't.scientific_name',
                    "t.cname_$rank as common_name",
                    'tsi.confusion_count',
                    'tsi.similarity_type',
                    'tsi.notes'
                )
                ->orderBy('tsi.confusion_count', 'desc')
                ->limit(6)
                ->get();

            // Jika data dari history kurang dari 6, tambahkan dari family yang sama
            if ($similarFromHistory->count() < 6) {
                $needed = 6 - $similarFromHistory->count();

                $similarFromFamily = DB::table('taxas')
                    ->where('family', $taxon->family)
                    ->where('id', '!=', $taxaId)
                    ->where('taxon_rank', $taxon->taxon_rank)
                    ->whereNotIn('id', $similarFromHistory->pluck('id'))
                    ->select(
                        'id',
                        "$rank as name",
                        'family',
                        'scientific_name',
                        "cname_$rank as common_name"
                    )
                    ->limit($needed)
                    ->get()
                    ->map(function($item) {
                        return (object) [
                            'id' => $item->id,
                            'name' => $item->name,
                            'family' => $item->family,
                            'scientific_name' => $item->scientific_name,
                            'common_name' => $item->common_name,
                            'confusion_count' => 0,
                            'similarity_type' => 'family',
                            'notes' => 'Dalam family yang sama'
                        ];
                    });

                $similarTaxa = $similarFromHistory->concat($similarFromFamily);
            } else {
                $similarTaxa = $similarFromHistory;
            }

            return response()->json([
                'success' => true,
                'data' => $similarTaxa->map(function($taxon) {
                    return [
                        'id' => $taxon->id,
                        'taxa_id' => $taxon->id,
                        'name' => $taxon->name,
                        'family' => $taxon->family,
                        'scientific_name' => $taxon->scientific_name,
                        'common_name' => $taxon->common_name,
                        'similarity_info' => [
                            'confusion_count' => $taxon->confusion_count,
                            'similarity_type' => $taxon->similarity_type,
                            'notes' => $taxon->notes
                        ]
                    ];
                })
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getSimilarTaxa:', [
                'taxa_id' => $taxaId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method untuk mendapatkan taksa bawahan
     */
    protected function getChildTaxa($parentValue, $parentRank)
    {
        // Tentukan rank bawahan berdasarkan hierarki
        $nextRanks = $this->getNextRanks($parentRank);
        
        if (empty($nextRanks)) {
            return collect([]);
        }

        $nextRank = $nextRanks[0];

        // Query untuk mendapatkan taksa bawahan
        $childTaxa = DB::table('taxas as t')
            ->whereNotNull("t.$nextRank")
            ->where("t.$parentRank", $parentValue)
            ->select(
                't.id as taxa_id',
                "t.$nextRank as name",
                't.scientific_name',
                "t.cname_$nextRank as common_name",
                't.description',
                DB::raw('LOWER(t.taxon_rank) as taxon_rank')
            )
            ->groupBy(
                't.id',
                "t.$nextRank",
                't.scientific_name',
                "t.cname_$nextRank",
                't.description',
                'taxon_rank'
            )
            ->limit(10)
            ->get();

        return $childTaxa;
    }

    /**
     * Helper method untuk mendapatkan semua ID taksa bawahan
     */
    protected function getAllChildTaxaIds($taxaId, $parentRank, $parentValue)
    {
        $childTaxaIds = collect([]);
        
        // Dapatkan semua taksa bawahan berdasarkan hierarki
        $nextRanks = $this->getSubordinateRanks($parentRank);
        
        if (!empty($nextRanks)) {
            foreach ($nextRanks as $rank) {
                $taxaInRank = DB::table('taxas')
                    ->where($parentRank, $parentValue)
                    ->whereRaw("LOWER(taxon_rank) = ?", [$rank])
                    ->select('id', 'scientific_name', $rank)
                    ->get();
                
                $childTaxaIds = $childTaxaIds->concat($taxaInRank);
            }
        }
        
        return $childTaxaIds;
    }

    /**
     * Helper method untuk mendapatkan rank bawahan langsung
     */
    protected function getNextRanks($rank)
    {
        $hierarchy = [
            'kingdom' => ['phylum', 'subphylum'],
            'phylum' => ['class', 'subclass'],
            'class' => ['order', 'suborder'],
            'order' => ['family', 'subfamily'],
            'family' => ['genus', 'subgenus'],
            'genus' => ['species'],
            'species' => ['subspecies', 'variety']
        ];

        return $hierarchy[$rank] ?? [];
    }

    /**
     * Helper method untuk mendapatkan semua rank bawahan
     */
    protected function getSubordinateRanks($rank)
    {
        $allRanks = [
            'kingdom' => ['phylum', 'subphylum', 'class', 'subclass', 'order', 'suborder', 'family', 'subfamily', 'genus', 'subgenus', 'species', 'subspecies', 'variety'],
            'phylum' => ['class', 'subclass', 'order', 'suborder', 'family', 'subfamily', 'genus', 'subgenus', 'species', 'subspecies', 'variety'],
            'class' => ['order', 'suborder', 'family', 'subfamily', 'genus', 'subgenus', 'species', 'subspecies', 'variety'],
            'order' => ['family', 'subfamily', 'genus', 'subgenus', 'species', 'subspecies', 'variety'],
            'family' => ['genus', 'subgenus', 'species', 'subspecies', 'variety'],
            'genus' => ['species', 'subspecies', 'variety'],
            'species' => ['subspecies', 'variety']
        ];

        return $allRanks[$rank] ?? [];
    }
} 