<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SpeciesGalleryController extends Controller
{
    public function getSpeciesGallery(Request $request)
    {
        try {
            $query = DB::table('fobi_checklist_taxas as fct')
                ->join('taxas as t', function($join) {
                    $join->on('fct.taxa_id', '=', 't.id')
                         ->orWhereRaw('t.burnes_fauna_id = fct.taxa_id')
                         ->orWhereRaw('t.kupnes_fauna_id = fct.taxa_id');
                })
                ->join('fobi_checklist_media as fcm', 'fct.id', '=', 'fcm.checklist_id')
                ->where('t.taxon_rank', 'species')
                ->select(
                    't.id as taxa_id',
                    't.species',
                    't.family',
                    't.cname_species',
                    't.scientific_name',
                    'fcm.habitat',
                    'fcm.date',
                    'fcm.spectrogram',
                    DB::raw('COUNT(DISTINCT fct.id) as observation_count'),
                    DB::raw('GROUP_CONCAT(DISTINCT fcm.file_path) as media_paths'),
                    DB::raw('GROUP_CONCAT(DISTINCT fcm.spectrogram) as spectrograms')
                )
                ->groupBy(
                    't.id',
                    't.species',
                    't.family',
                    't.cname_species',
                    't.scientific_name',
                    'fcm.habitat',
                    'fcm.date',
                    'fcm.spectrogram'
                );

            // Filter pencarian
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('t.scientific_name', 'like', "%{$search}%")
                        ->orWhere('t.species', 'like', "%{$search}%")
                        ->orWhere('t.family', 'like', "%{$search}%")
                        ->orWhere('t.cname_species', 'like', "%{$search}%");
                });
            }

            $species = $query->paginate(12);

            return response()->json([
                'success' => true,
                'data' => $species
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getSimilarSpecies($taxaId)
    {
        try {
            $species = DB::table('taxas')
                ->where('id', $taxaId)
                ->first();

            if (!$species) {
                return response()->json([
                    'success' => false,
                    'message' => 'Species tidak ditemukan'
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
                ->where('t.taxon_rank', 'species')
                ->select(
                    't.id',
                    't.species',
                    't.family',
                    't.cname_species',
                    't.scientific_name',
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
                    ->where('family', $species->family)
                    ->where('id', '!=', $taxaId)
                    ->where('taxon_rank', 'species')
                    ->whereNotIn('id', $similarFromHistory->pluck('id'))
                    ->select(
                        'id',
                        'species',
                        'family',
                        'cname_species',
                        'scientific_name'
                    )
                    ->limit($needed)
                    ->get()
                    ->map(function($item) {
                        return (object) [
                            'id' => $item->id,
                            'species' => $item->species,
                            'family' => $item->family,
                            'cname_species' => $item->cname_species,
                            'scientific_name' => $item->scientific_name,
                            'confusion_count' => 0,
                            'similarity_type' => 'family',
                            'notes' => 'Dalam family yang sama'
                        ];
                    });

                $similarSpecies = $similarFromHistory->concat($similarFromFamily);
            } else {
                $similarSpecies = $similarFromHistory;
            }

            return response()->json([
                'success' => true,
                'data' => $similarSpecies->map(function($species) {
                    return [
                        'id' => $species->id,
                        'taxa_id' => $species->id,
                        'species' => $species->species,
                        'family' => $species->family,
                        'cname_species' => $species->cname_species,
                        'scientific_name' => $species->scientific_name,
                        'similarity_info' => [
                            'confusion_count' => $species->confusion_count,
                            'similarity_type' => $species->similarity_type,
                            'notes' => $species->notes
                        ]
                    ];
                })
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getSimilarSpecies:', [
                'taxa_id' => $taxaId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getSpeciesDistribution($taxaId)
    {
        try {
            // Dapatkan data spesies
            $speciesData = DB::table('taxas')
                ->where('id', $taxaId)
                ->select('id', 'species', 'genus', 'scientific_name', 'class', 'burnes_fauna_id', 'kupnes_fauna_id')
                ->first();

            if (!$speciesData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Spesies tidak ditemukan'
                ], 404);
            }

            $speciesSciName = $speciesData->scientific_name;
            $species = $speciesData->species;
            $genus = $speciesData->genus;
            $classData = $speciesData->class;
            $burnes_fauna_id = $speciesData->burnes_fauna_id;
            $kupnes_fauna_id = $speciesData->kupnes_fauna_id;
            
            // Extract species tanpa author name, jika ada
            $speciesWithoutAuthor = preg_replace('/\s+\([^)]+\)/', '', $speciesSciName);

            // Log informasi spesies untuk debugging
            \Log::info('Species data for distribution:', [
                'taxa_id' => $taxaId,
                'scientific_name' => $speciesSciName,
                'without_author' => $speciesWithoutAuthor,
                'species' => $species,
                'genus' => $genus,
                'class' => $classData,
                'burnes_fauna_id' => $burnes_fauna_id,
                'kupnes_fauna_id' => $kupnes_fauna_id
            ]);

            $allLocations = collect([]);
            
            // 1. Query untuk data dari fobi_checklist_taxas (database lokal)
            $fobiLocations = DB::table('fobi_checklist_taxas as fct')
                ->distinct()
                ->where(function($query) use ($taxaId, $speciesWithoutAuthor, $speciesSciName) {
                    $query->where('fct.taxa_id', $taxaId)
                          ->orWhere('fct.scientific_name', 'LIKE', $speciesWithoutAuthor . '%');
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
            \Log::info('FOBI locations found:', ['count' => $fobiLocations->count()]);

            // 2. Query untuk Burungnesia (database second) - selalu coba untuk semua class, verifikasi koneksi
            try {
                // Jika punya ID di burungnesia, gunakan ID tersebut
                $burungnesiaQuery = DB::connection('second')
                    ->table('checklist_fauna')
                    ->distinct()
                    ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->whereNotNull('checklists.latitude')
                    ->whereNotNull('checklists.longitude')
                    ->whereNull('checklists.deleted_at');

                // Gunakan fauna ID jika tersedia, kalau tidak gunakan pencarian berdasarkan nama
                if (!empty($burnes_fauna_id)) {
                    $burungnesiaQuery->where('checklist_fauna.fauna_id', $burnes_fauna_id);
                    \Log::info('Searching Burungnesia with ID:', ['burnes_fauna_id' => $burnes_fauna_id]);
                } else {
                    $burungnesiaQuery->where(function($query) use ($speciesWithoutAuthor, $genus, $species) {
                        $query->where('faunas.nameLat', 'LIKE', $speciesWithoutAuthor . '%')
                              ->orWhere('faunas.nameLat', 'LIKE', $genus . ' ' . $species . '%')
                              ->orWhere('faunas.nameLat', 'LIKE', $genus . '%');
                    });
                    \Log::info('Searching Burungnesia with names:', [
                        'scientific_name' => $speciesWithoutAuthor,
                        'genus_species' => $genus . ' ' . $species,
                        'genus' => $genus
                    ]);
                }

                $burungnesiaLocations = $burungnesiaQuery
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
                \Log::info('Burungnesia locations for species:', [
                    'species' => $speciesSciName,
                    'count' => $burungnesiaLocations->count(),
                    'matched_names' => $burungnesiaLocations->pluck('matched_name')->unique()->take(5)
                ]);
            } catch (\Exception $e) {
                \Log::error('Burungnesia query error:', [
                    'error' => $e->getMessage(),
                    'line' => $e->getLine(),
                    'file' => $e->getFile()
                ]);
            }

            // 3. Query untuk Kupunesia (database third) - selalu coba untuk semua class, verifikasi koneksi
            try {
                // Jika punya ID di kupunesia, gunakan ID tersebut
                $kupunesiaQuery = DB::connection('third')
                    ->table('checklist_fauna')
                    ->distinct()
                    ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->whereNotNull('checklists.latitude')
                    ->whereNotNull('checklists.longitude')
                    ->whereNull('checklists.deleted_at');

                // Gunakan fauna ID jika tersedia, kalau tidak gunakan pencarian berdasarkan nama
                if (!empty($kupnes_fauna_id)) {
                    $kupunesiaQuery->where('checklist_fauna.fauna_id', $kupnes_fauna_id);
                    \Log::info('Searching Kupunesia with ID:', ['kupnes_fauna_id' => $kupnes_fauna_id]);
                } else {
                    $kupunesiaQuery->where(function($query) use ($speciesWithoutAuthor, $genus, $species) {
                        $query->where('faunas.nameLat', 'LIKE', $speciesWithoutAuthor . '%')
                              ->orWhere('faunas.nameLat', 'LIKE', $genus . ' ' . $species . '%')
                              ->orWhere('faunas.nameLat', 'LIKE', $genus . '%');
                    });
                    \Log::info('Searching Kupunesia with names:', [
                        'scientific_name' => $speciesWithoutAuthor,
                        'genus_species' => $genus . ' ' . $species,
                        'genus' => $genus
                    ]);
                }

                $kupunesiaLocations = $kupunesiaQuery
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
                \Log::info('Kupunesia locations for species:', [
                    'species' => $speciesSciName,
                    'count' => $kupunesiaLocations->count(),
                    'matched_names' => $kupunesiaLocations->pluck('matched_name')->unique()->take(5)
                ]);
            } catch (\Exception $e) {
                \Log::error('Kupunesia query error:', [
                    'error' => $e->getMessage(),
                    'line' => $e->getLine(),
                    'file' => $e->getFile()
                ]);
            }

            // Pastikan semua lokasi unik berdasarkan kombinasi latitude, longitude dan source
            $uniqueLocations = $allLocations->unique(function ($item) {
                return $item['latitude'] . '_' . $item['longitude'] . '_' . $item['source'];
            })->values();

            \Log::info('Species distribution data summary:', [
                'species' => $speciesSciName,
                'total_locations' => $uniqueLocations->count(),
                'sources_count' => [
                    'fobi' => $fobiLocations->count(),
                    'burungnesia' => $uniqueLocations->where('source', 'burungnesia')->count(),
                    'kupunesia' => $uniqueLocations->where('source', 'kupunesia')->count()
                ],
                'sources' => $uniqueLocations->pluck('source')->unique()
            ]);

            return response()->json([
                'success' => true,
                'data' => $uniqueLocations
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getSpeciesDistribution:', [
                'taxa_id' => $taxaId,
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getSpeciesDetail($taxaId)
    {
        try {
            // Ambil data species dari taxa
            $species = DB::table('taxas as t')
                ->where('t.id', $taxaId)
                ->select(
                    't.id as taxa_id',
                    't.species',
                    't.family',
                    't.cname_species',
                    't.scientific_name',
                    't.kingdom',
                    't.phylum',
                    't.class',
                    't.order',
                    't.genus',
                    't.subspecies',
                    't.variety',
                    't.form',
                    't.description',
                    DB::raw('COALESCE(t.iucn_red_list_category, "Tidak ada data") as iucn_red_list_category'),
                    DB::raw('COALESCE(t.status_kepunahan, "Tidak ada data") as status_kepunahan')
                )
                ->first();

            if (!$species) {
                return response()->json([
                    'success' => false,
                    'message' => 'Species tidak ditemukan'
                ], 404);
            }

            // Ambil semua media untuk species ini
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

            // Ambil semua lokasi pengamatan yang valid
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

            // Log untuk debugging
            \Log::info('Species Detail Request', [
                'taxa_id' => $taxaId,
                'species' => $species,
                'media_count' => $media->count(),
                'locations_count' => $locations->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'species' => $species,
                    'media' => $media,
                    'locations' => $locations
                ]
            ]);
        } catch (\Exception $e) {
            // Log error untuk debugging
            \Log::error('Error in getSpeciesDetail', [
                'taxa_id' => $taxaId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

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
}
