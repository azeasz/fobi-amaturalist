<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GenusGalleryController extends Controller
{
    public function getGenusGallery(Request $request)
    {
        try {
            // Subquery untuk mendapatkan species dalam genus
            $speciesSubquery = DB::table('taxas as t2')
                ->select('t2.genus', DB::raw('GROUP_CONCAT(t2.id) as species_ids'))
                ->where('t2.taxon_rank', 'species')
                ->groupBy('t2.genus');

            // Query utama dimulai dari tabel taxas
            $query = DB::table('taxas as t')
                ->leftJoin('fobi_checklist_taxas as fct', function($join) {
                    $join->on('fct.taxa_id', '=', 't.id')
                         ->orWhereRaw('t.burnes_fauna_id = fct.taxa_id')
                         ->orWhereRaw('t.kupnes_fauna_id = fct.taxa_id');
                })
                ->leftJoin('fobi_checklist_media as fcm', 'fct.id', '=', 'fcm.checklist_id')
                ->leftJoinSub($speciesSubquery, 'species_in_genus', function($join) {
                    $join->on('t.genus', '=', 'species_in_genus.genus');
                })
                ->where('t.taxon_rank', 'genus')
                ->select(
                    't.id as taxa_id',
                    't.genus',
                    't.family',
                    't.scientific_name',
                    't.cname_genus',
                    't.description',
                    'species_in_genus.species_ids',
                    DB::raw('COUNT(DISTINCT fct.id) as observation_count'),
                    DB::raw('GROUP_CONCAT(DISTINCT fcm.file_path) as media_paths'),
                    DB::raw('GROUP_CONCAT(DISTINCT fcm.spectrogram) as spectrograms'),
                    DB::raw('(
                        SELECT COUNT(DISTINCT fct2.id)
                        FROM fobi_checklist_taxas fct2
                        WHERE FIND_IN_SET(fct2.taxa_id, COALESCE(species_in_genus.species_ids, ""))
                    ) as species_observations')
                )
                ->groupBy(
                    't.id',
                    't.genus',
                    't.family',
                    't.scientific_name',
                    't.cname_genus',
                    't.description',
                    'species_in_genus.species_ids'
                );

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('t.scientific_name', 'like', "%{$search}%")
                        ->orWhere('t.genus', 'like', "%{$search}%")
                        ->orWhere('t.family', 'like', "%{$search}%")
                        ->orWhere('t.cname_genus', 'like', "%{$search}%");
                });
            }

            $genera = $query->paginate(12);

            // Transform data untuk menambahkan informasi species
            $generaData = $genera->through(function ($genus) {
                // Ambil daftar species dalam genus ini
                $speciesInGenus = DB::table('taxas')
                    ->where('genus', $genus->genus)
                    ->where('taxon_rank', 'species')
                    ->select(
                        'id',
                        'species',
                        'scientific_name',
                        'description'
                    )
                    ->get();

                // Ambil jumlah pengamatan untuk setiap species
                $speciesWithObservations = $speciesInGenus->map(function($species) {
                    $observationCount = DB::table('fobi_checklist_taxas')
                        ->where('taxa_id', $species->id)
                        ->count();

                    return (object) [
                        'id' => $species->id,
                        'species' => $species->species,
                        'scientific_name' => $species->scientific_name,
                        'description' => $species->description,
                        'observation_count' => $observationCount
                    ];
                });

                // Tambahkan data species ke object genus
                $genus->species_list = $speciesWithObservations;

                return $genus;
            });

            // Kembalikan data dengan format yang sesuai untuk infinite scroll
            return response()->json([
                'success' => true,
                'data' => [
                    'data' => $generaData->items(),
                    'current_page' => $genera->currentPage(),
                    'last_page' => $genera->lastPage(),
                    'per_page' => $genera->perPage(),
                    'total' => $genera->total()
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getGenusGallery:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getGenusDetail($taxaId)
    {
        try {
            $genus = DB::table('taxas as t')
                ->where('t.id', $taxaId)
                ->select(
                    't.id as taxa_id',
                    't.genus',
                    't.family',
                    't.scientific_name',
                    't.species',
                    't.cname_species',
                    't.cname_genus',
                    't.description',
                    't.kingdom',
                    't.phylum', 
                    't.class',
                    't.order',
                    DB::raw('COALESCE(t.iucn_red_list_category, "Tidak ada data") as iucn_red_list_category')
                )
                ->first();

            if (!$genus) {
                return response()->json([
                    'success' => false,
                    'message' => 'Genus tidak ditemukan'
                ], 404);
            }

            // Ambil semua species dalam genus ini
            $species = DB::table('taxas')
                ->where('genus', $genus->genus)
                ->where('taxon_rank', 'species')
                ->select('id as taxa_id', 'species', 'scientific_name', 'family', 'cname_species', 'cname_genus')
                ->get();

            // Ambil semua media untuk genus ini
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
                    'genus' => $genus,
                    'species' => $species,
                    'media' => $media,
                    'locations' => $locations
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'debug_info' => config('app.debug') ? [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ] : null
            ], 500);
        }
    }

    public function getSimilarGenera($taxaId)
    {
        try {
            $genus = DB::table('taxas')
                ->where('id', $taxaId)
                ->first();

            if (!$genus) {
                return response()->json([
                    'success' => false,
                    'message' => 'Genus tidak ditemukan'
                ], 404);
            }

            // Coba ambil dari taxa_similar_identifications dulu
            $similarFromHistory = DB::table('taxa_similar_identifications as tsi')
                ->join('taxas as t', function($join) use ($taxaId) {
                    $join->on('t.id', '=', 'tsi.similar_taxa_id')
                         ->where('tsi.taxa_id', '=', $taxaId)
                         ->orOn('t.id', '=', 'tsi.taxa_id')
                         ->where('tsi.similar_taxa_id', '=', $taxaId);
                })
                ->where('t.id', '!=', $taxaId)
                ->where('t.taxon_rank', 'genus')
                ->select(
                    't.id',
                    't.genus',
                    't.family',
                    't.scientific_name',
                    't.cname_genus',
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
                    ->where('family', $genus->family)
                    ->where('id', '!=', $taxaId)
                    ->where('taxon_rank', 'genus')
                    ->whereNotIn('id', $similarFromHistory->pluck('id'))
                    ->select(
                        'id',
                        'genus',
                        'family',
                        'scientific_name',
                        'cname_genus'
                    )
                    ->limit($needed)
                    ->get()
                    ->map(function($item) {
                        return (object) [
                            'id' => $item->id,
                            'genus' => $item->genus,
                            'family' => $item->family,
                            'scientific_name' => $item->scientific_name,
                            'cname_genus' => $item->cname_genus,
                            'confusion_count' => 0,
                            'similarity_type' => 'family',
                            'notes' => 'Dalam family yang sama'
                        ];
                    });

                $similarGenera = $similarFromHistory->concat($similarFromFamily);
            } else {
                $similarGenera = $similarFromHistory;
            }

            return response()->json([
                'success' => true,
                'data' => $similarGenera->map(function($genus) {
                    return [
                        'id' => $genus->id,
                        'taxa_id' => $genus->id,
                        'genus' => $genus->genus,
                        'family' => $genus->family,
                        'scientific_name' => $genus->scientific_name,
                        'cname_genus' => $genus->cname_genus,
                        'similarity_info' => [
                            'confusion_count' => $genus->confusion_count,
                            'similarity_type' => $genus->similarity_type,
                            'notes' => $genus->notes
                        ]
                    ];
                })
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getSimilarGenera:', [
                'taxa_id' => $taxaId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getGenusDistribution($taxaId)
    {
        try {
            // Dapatkan data genus
            $genusData = DB::table('taxas')
                ->where('id', $taxaId)
                ->select('id', 'genus', 'class', 'scientific_name')
                ->first();

            if (!$genusData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Genus tidak ditemukan'
                ], 404);
            }

            $genusSciName = $genusData->scientific_name;
            $genus = $genusData->genus;
            $classData = $genusData->class;

            // Ambil semua species dalam genus ini
            $speciesInGenus = DB::table('taxas')
                ->where('genus', $genus)
                ->where('taxon_rank', 'species')
                ->select('id', 'scientific_name', 'burnes_fauna_id', 'kupnes_fauna_id')
                ->get();

            $allLocations = collect([]);

            // 1. Query untuk data dari fobi_checklist_taxas (database lokal)
            $fobiLocations = DB::table('fobi_checklist_taxas as fct')
                ->distinct()
                ->where(function($query) use ($taxaId, $genus, $speciesInGenus) {
                    $query->where('fct.taxa_id', $taxaId)
                          ->orWhereIn('fct.taxa_id', $speciesInGenus->pluck('id'))
                          ->orWhere('fct.genus', $genus);
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

            // Hanya ambil dari Burungnesia jika kelas adalah Aves (burung)
            // dan Kupunesia jika kelas adalah Insecta atau Lepidoptera (kupu-kupu)
            if (in_array(strtolower($classData), ['aves'])) {
                // 2. Query untuk Burungnesia (database second)
                try {
                    $burungnesiaLocations = DB::connection('second')
                        ->table('checklist_fauna')
                        ->distinct()
                        ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                        ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                        ->where(function($query) use ($genus) {
                            $query->where('faunas.nameLat', 'LIKE', $genus . '%');
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

            if (in_array(strtolower($classData), ['insecta', 'lepidoptera'])) {
                // 3. Query untuk Kupunesia (database third)
                try {
                    $kupunesiaLocations = DB::connection('third')
                        ->table('checklist_fauna')
                        ->distinct()
                        ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                        ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                        ->where(function($query) use ($genus) {
                            $query->where('faunas.nameLat', 'LIKE', $genus . '%');
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

            // Pastikan semua lokasi unik berdasarkan kombinasi latitude, longitude dan source
            $uniqueLocations = $allLocations->unique(function ($item) {
                return $item['latitude'] . '_' . $item['longitude'] . '_' . $item['source'];
            })->values();

            \Log::info('Genus distribution data:', [
                'genus' => $genus,
                'class' => $classData,
                'total_locations' => $uniqueLocations->count(),
                'fobi_count' => $fobiLocations->count(),
                'sources' => $uniqueLocations->pluck('source')->unique()
            ]);

            return response()->json([
                'success' => true,
                'data' => $uniqueLocations
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getGenusDistribution:', [
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
}
