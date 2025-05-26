<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SpeciesSuggestionController extends Controller
{
    public function suggest(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2',
                'include_locations' => 'nullable|in:true,false,0,1',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
                'include_all_taxa' => 'nullable|in:true,false,0,1'
            ]);

            // Normalisasi query: ganti tanda "-" dengan spasi dan sebaliknya untuk pencarian fleksibel
            $originalQuery = $request->get('query');
            $normalizedQuery = str_replace('-', ' ', $originalQuery);
            $alternativeQuery = str_replace(' ', '-', $originalQuery);
            
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 50); // Meningkatkan default per_page
            $offset = ($page - 1) * $perPage;
            $includeAllTaxa = $request->get('include_all_taxa') === 'true' || $request->get('include_all_taxa') === '1';

            if (empty($normalizedQuery)) {
                return response()->json([
                    'data' => [],
                    'success' => true
                ]);
            }

            // Define taxonomic ranks in hierarchical order
            $taxonomicRanks = [
                'domain' => ['field' => 'domain', 'cname' => 'cname_domain'],
                'superkingdom' => ['field' => 'superkingdom', 'cname' => 'cname_superkingdom'],
                'kingdom' => ['field' => 'kingdom', 'cname' => 'cname_kingdom'],
                'subkingdom' => ['field' => 'subkingdom', 'cname' => 'cname_subkingdom'],
                'superphylum' => ['field' => 'superphylum', 'cname' => 'cname_superphylum'],
                'phylum' => ['field' => 'phylum', 'cname' => 'cname_phylum'],
                'subphylum' => ['field' => 'subphylum', 'cname' => 'cname_subphylum'],
                'superclass' => ['field' => 'superclass', 'cname' => 'cname_superclass'],
                'class' => ['field' => 'class', 'cname' => 'cname_class'],
                'subclass' => ['field' => 'subclass', 'cname' => 'cname_subclass'],
                'infraclass' => ['field' => 'infraclass', 'cname' => 'cname_infraclass'],
                'superorder' => ['field' => 'superorder', 'cname' => 'cname_superorder'],
                'order' => ['field' => 'order', 'cname' => 'cname_order'],
                'suborder' => ['field' => 'suborder', 'cname' => 'cname_suborder'],
                'infraorder' => ['field' => 'infraorder', 'cname' => null],
                'superfamily' => ['field' => 'superfamily', 'cname' => 'cname_superfamily'],
                'family' => ['field' => 'family', 'cname' => 'cname_family'],
                'subfamily' => ['field' => 'subfamily', 'cname' => 'cname_subfamily'],
                'supertribe' => ['field' => 'supertribe', 'cname' => 'cname_supertribe'],
                'tribe' => ['field' => 'tribe', 'cname' => 'cname_tribe'],
                'subtribe' => ['field' => 'subtribe', 'cname' => 'cname_subtribe'],
                'genus' => ['field' => 'genus', 'cname' => 'cname_genus'],
                'subgenus' => ['field' => 'subgenus', 'cname' => 'cname_subgenus'],
                'species' => ['field' => 'species', 'cname' => 'cname_species'],
                'subspecies' => ['field' => 'subspecies', 'cname' => 'cname_subspecies'],
                'variety' => ['field' => 'variety', 'cname' => 'cname_variety'],
                'form' => ['field' => 'form', 'cname' => null]
            ];

            $queryBuilder = DB::table('taxas')
                ->select([
                    'id',
                    'taxon_rank',
                    'scientific_name',
                    'taxonomic_status',
                    'domain',
                    'cname_domain',
                    'superkingdom',
                    'cname_superkingdom',
                    'kingdom',
                    'cname_kingdom',
                    'subkingdom',
                    'cname_subkingdom',
                    'superphylum',
                    'cname_superphylum',
                    'phylum',
                    'cname_phylum',
                    'subphylum',
                    'cname_subphylum',
                    'superclass',
                    'cname_superclass',
                    'class',
                    'cname_class',
                    'subclass',
                    'cname_subclass',
                    'infraclass',
                    'cname_infraclass',
                    'superorder',
                    'cname_superorder',
                    'order',
                    'cname_order',
                    'suborder',
                    'cname_suborder',
                    'infraorder',
                    'superfamily',
                    'cname_superfamily',
                    'family',
                    'cname_family',
                    'subfamily',
                    'cname_subfamily',
                    'supertribe',
                    'cname_supertribe',
                    'tribe',
                    'cname_tribe',
                    'subtribe',
                    'cname_subtribe',
                    'genus',
                    'cname_genus',
                    'subgenus',
                    'cname_subgenus',
                    'species',
                    'cname_species',
                    'subspecies',
                    'cname_subspecies',
                    'variety',
                    'cname_variety',
                    'form'
                ])
                ->where('taxonomic_status', 'accepted')
                ->where(function($q) use ($normalizedQuery, $alternativeQuery) {
                    // Pisahkan kata kunci pencarian
                    $searchTerms = array_filter(preg_split('/[\s-]+/', strtolower($normalizedQuery)));
                    $searchPattern = '%' . implode('%', $searchTerms) . '%';
                    
                    // Pattern alternatif untuk mencari dengan tanda "-"
                    $alternativePattern = '%' . str_replace(' ', '%', strtolower($alternativeQuery)) . '%';
                    
                    $q->where(function($sq) use ($searchPattern, $alternativePattern) {
                        // Cari di family
                        $sq->where(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(family)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(family)"), 'LIKE', $alternativePattern)
                              ->orWhere(DB::raw("LOWER(cname_family)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(cname_family)"), 'LIKE', $alternativePattern);
                        });
                        // Cari di genus
                        $sq->orWhere(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(genus)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(genus)"), 'LIKE', $alternativePattern)
                              ->orWhere(DB::raw("LOWER(cname_genus)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(cname_genus)"), 'LIKE', $alternativePattern);
                        });
                        // Cari di species
                        $sq->orWhere(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(species)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(species)"), 'LIKE', $alternativePattern)
                              ->orWhere(DB::raw("LOWER(cname_species)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(cname_species)"), 'LIKE', $alternativePattern);
                        });
                        // Cari di subspecies
                        $sq->orWhere(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(subspecies)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(subspecies)"), 'LIKE', $alternativePattern)
                              ->orWhere(DB::raw("LOWER(cname_subspecies)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(cname_subspecies)"), 'LIKE', $alternativePattern);
                        });
                        // Cari di variety
                        $sq->orWhere(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(variety)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(variety)"), 'LIKE', $alternativePattern)
                              ->orWhere(DB::raw("LOWER(cname_variety)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(cname_variety)"), 'LIKE', $alternativePattern);
                        });
                        // Cari di form (tanpa cname)
                        $sq->orWhere(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(form)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(form)"), 'LIKE', $alternativePattern);
                        });
                        
                        // Tambahkan pencarian di order untuk kasus seperti "elang"
                        $sq->orWhere(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(`order`)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(`order`)"), 'LIKE', $alternativePattern)
                              ->orWhere(DB::raw("LOWER(cname_order)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(cname_order)"), 'LIKE', $alternativePattern);
                        });
                        
                        // Tambahkan pencarian di class untuk kasus seperti "ikan"
                        $sq->orWhere(function($q) use ($searchPattern, $alternativePattern) {
                            $q->where(DB::raw("LOWER(class)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(class)"), 'LIKE', $alternativePattern)
                              ->orWhere(DB::raw("LOWER(cname_class)"), 'LIKE', $searchPattern)
                              ->orWhere(DB::raw("LOWER(cname_class)"), 'LIKE', $alternativePattern);
                        });
                    });
                });

            // Jika include_all_taxa=true, jangan batasi rank
            if (!$includeAllTaxa) {
                $queryBuilder->whereIn('taxon_rank', ['family', 'genus', 'species', 'subspecies', 'variety', 'form']);
            }

            // Tambahkan ordering untuk hasil yang lebih relevan
            $queryBuilder->orderByRaw("
                CASE 
                    WHEN LOWER(cname_species) LIKE ? THEN 1
                    WHEN LOWER(species) LIKE ? THEN 2
                    WHEN LOWER(cname_genus) LIKE ? THEN 3
                    WHEN LOWER(genus) LIKE ? THEN 4
                    WHEN LOWER(cname_family) LIKE ? THEN 5
                    WHEN LOWER(family) LIKE ? THEN 6
                    ELSE 7
                END
            ", [
                '%' . strtolower($normalizedQuery) . '%',
                '%' . strtolower($normalizedQuery) . '%',
                '%' . strtolower($normalizedQuery) . '%',
                '%' . strtolower($normalizedQuery) . '%',
                '%' . strtolower($normalizedQuery) . '%',
                '%' . strtolower($normalizedQuery) . '%'
            ]);

            $total = $queryBuilder->count();
            $results = $queryBuilder->offset($offset)
                                  ->limit($perPage)
                                  ->get();

            // Process and format results
            $formattedResults = $results->map(function($item) use ($taxonomicRanks, $normalizedQuery, $alternativeQuery) {
                // Find the most relevant matching rank
                $matchingRank = $this->findMatchingRank($item, $normalizedQuery, $alternativeQuery, $taxonomicRanks);

                if (!$matchingRank) {
                    return null;
                }

                $rankInfo = $taxonomicRanks[$matchingRank];
                $scientificName = $item->{$rankInfo['field']};
                $commonName = $rankInfo['cname'] ? $item->{$rankInfo['cname']} : null;

                // Build hierarchical context
                $context = $this->buildHierarchicalContext($item, $taxonomicRanks);

                // Format display name
                $displayName = $this->formatDisplayName($scientificName, $commonName, $matchingRank);
                if (($matchingRank === 'genus' || $matchingRank === 'species') && $item->family) {
                    $familyCommonName = $item->cname_family;
                    $displayName .= " | Family: {$item->family}";
                    if ($familyCommonName) {
                        $displayName .= " ($familyCommonName)";
                    }
                }

                return [
                    'id' => $item->id,
                    'rank' => $matchingRank,
                    'scientific_name' => $item->{$matchingRank}, // Use the actual rank field
                    'common_name' => $commonName,
                    'full_data' => $item,
                    'hierarchy' => $context,
                    'display_name' => $displayName
                ];
            })
            ->filter() // Remove null values
            ->unique('scientific_name') // Remove duplicates
                        ->values();

            return response()->json([
                'data' => $formattedResults,
                'success' => true,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => ceil($total / $perPage)
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in species suggestion: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'data' => [],
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari spesies: ' . $e->getMessage()
            ], 500);
        }
    }

    private function formatDisplayName($scientificName, $commonName, $rank)
    {
        // Tampilkan scientific name terlebih dahulu, diikuti dengan common name dalam tanda kurung
        $displayName = $scientificName;
        if ($commonName) {
            $displayName .= " ($commonName)";
        }
        return "$displayName - " . ucfirst($rank);
    }

    private function findMatchingRank($item, $query, $alternativeQuery, $taxonomicRanks) {
        $searchTerms = array_filter(preg_split('/[\s-]+/', strtolower($query)));
        $alternativeTerms = array_filter(preg_split('/[\s-]+/', strtolower($alternativeQuery)));

        // Gabungkan semua kemungkinan term untuk pencarian
        $allTerms = array_unique(array_merge($searchTerms, $alternativeTerms));

        // Check each rank from most specific to least specific
        foreach (array_reverse($taxonomicRanks) as $rank => $info) {
            $fieldValue = $item->{$info['field']};
            $cnameValue = $info['cname'] ? $item->{$info['cname']} : null;

            if (empty($fieldValue)) {
                continue;
            }

            // Ubah logika pencocokan: cukup jika salah satu term ditemukan di nama ilmiah atau nama umum
            $fieldMatches = false;
            $cnameMatches = false;
            $fieldValueLower = strtolower($fieldValue);
            $cnameValueLower = $cnameValue ? strtolower($cnameValue) : '';

            // Cek apakah ada term yang cocok dengan nama ilmiah
            foreach ($allTerms as $term) {
                if (stripos($fieldValueLower, $term) !== false) {
                    $fieldMatches = true;
                    break; // Cukup satu term yang cocok
                }
            }

            // Cek apakah ada term yang cocok dengan nama umum
            if ($cnameValue) {
                foreach ($allTerms as $term) {
                    if (stripos($cnameValueLower, $term) !== false) {
                        $cnameMatches = true;
                        break; // Cukup satu term yang cocok
                    }
                }
            }

            if ($fieldMatches || $cnameMatches) {
                return $rank;
            }
        }

        return null;
    }

    private function buildHierarchicalContext($item, $taxonomicRanks) {
        $context = [];
        foreach ($taxonomicRanks as $rank => $info) {
            if ($item->{$info['field']}) {
                $context[$rank] = [
                    'name' => $item->{$info['field']},
                    'common_name' => $info['cname'] ? $item->{$info['cname']} : null
                ];
            }
        }
        return $context;
    }

    private function getFobiLocations($taxaId)
    {
        // Lokasi dari fobi_checklists (burungnesia)
        $burungnesiaLocations = DB::table('fobi_checklists')
            ->join('fobi_checklist_faunasv1', 'fobi_checklists.id', '=', 'fobi_checklist_faunasv1.checklist_id')
            ->where('fobi_checklist_faunasv1.fauna_id', $taxaId)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('latitude', 'longitude')
            ->get();

        // Lokasi dari fobi_checklists_kupnes (kupunesia)
        $kupunesiaLocations = DB::table('fobi_checklists_kupnes')
            ->join('fobi_checklist_faunasv2', 'fobi_checklists_kupnes.id', '=', 'fobi_checklist_faunasv2.checklist_id')
            ->where('fobi_checklist_faunasv2.fauna_id', $taxaId)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('latitude', 'longitude')
            ->get();

        // Lokasi dari fobi_checklist_taxas
        $taxaLocations = DB::table('fobi_checklist_taxas')
            ->where('taxa_id', $taxaId)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('latitude', 'longitude')
            ->get();

        return $burungnesiaLocations->concat($kupunesiaLocations)
            ->concat($taxaLocations)
            ->map(function($item) {
                return [
                    'latitude' => (float) $item->latitude,
                    'longitude' => (float) $item->longitude,
                    'source' => 'fobi'
                ];
            });
    }

    private function getBurungnesiaLocations($taxaId)
    {
        return DB::connection('second')
            ->table('checklists')
            ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->where('checklist_fauna.fauna_id', $taxaId)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('latitude', 'longitude')
            ->get()
            ->map(function($item) {
                return [
                    'latitude' => (float) $item->latitude,
                    'longitude' => (float) $item->longitude,
                    'source' => 'burungnesia'
                ];
            });
    }

    private function getKupunesiaLocations($taxaId)
    {
        return DB::connection('third')
            ->table('checklists')
            ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->where('checklist_fauna.fauna_id', $taxaId)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('latitude', 'longitude')
            ->get()
            ->map(function($item) {
                return [
                    'latitude' => (float) $item->latitude,
                    'longitude' => (float) $item->longitude,
                    'source' => 'kupunesia'
                ];
            });
    }
}
