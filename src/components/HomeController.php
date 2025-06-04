<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderFauna;
use App\Models\Fauna;
use App\Models\Taxontest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class HomeController extends Controller
{
    public function getOrderFaunas()
    {
        $orderFaunas = OrderFauna::orderBy('ordo_order')->orderBy('famili_order')->get()->keyBy('famili');
        return response()->json($orderFaunas);
    }

    public function getChecklists()
    {
        $checklistsAka = DB::connection('second')->table('checklists')
            ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->select('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at', DB::raw("'burungnesia' as source"))
            ->groupBy('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at')
            ->get();

        $checklistsKupnes = DB::connection('third')->table('checklists')
            ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->select('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at', DB::raw("'kupunesia' as source"))
            ->groupBy('checklists.latitude', 'checklists.longitude', 'checklists.id', 'checklists.created_at')
            ->get();

        $checklists = $checklistsAka->merge($checklistsKupnes);
        return response()->json($checklists);
    }

    public function getFamilies()
    {
        $families = Fauna::select('family')->distinct()->get();
        $orderFaunas = OrderFauna::orderBy('ordo_order')->orderBy('famili_order')->get()->keyBy('famili');

        $families = $families->map(function ($family) use ($orderFaunas) {
            $family->ordo = $orderFaunas->get($family->family)->ordo ?? null;
            return $family;
        });

        return response()->json($families);
    }

    public function getOrdos()
    {
        $ordos = OrderFauna::select('ordo')->distinct()->get();
        return response()->json($ordos);
    }

    public function getFaunas()
    {
        $faunas = Fauna::all();
        return response()->json($faunas);
    }

    public function getTaxontest()
    {
        $taxontest = Taxontest::all();
        return response()->json($taxontest);
    }

    private function applyCommonFilters($query, Request $request)
    {
        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }
        if ($request->has('has_media')) {
            $query->where('has_media', $request->has_media);
        }
        if ($request->has('media_type')) {
            $query->where('media_type', $request->media_type);
        }
        if ($request->has('grade')) {
            $grades = explode(',', $request->grade);
            $query->whereIn('grade', $grades);
        }
        
        // Location based filtering
        if ($request->has('latitude') && $request->has('longitude')) {
            $lat = $request->latitude;
            $lon = $request->longitude;
            $radius = $request->get('radius', 10); // Default 10km
            
            $query->whereRaw("
                ST_Distance_Sphere(
                    point(longitude, latitude),
                    point(?, ?)
                ) <= ?
            ", [$lon, $lat, $radius * 1000]);
        }
        
        return $query;
    }

    public function getBurungnesiaCount(Request $request)
    {
        try {
            $query = DB::connection('second')->table('checklists');
            $query = $this->applyCommonFilters($query, $request);
            
            if ($request->has('search')) {
                $search = $request->search;
                $query->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                      ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                      ->where(function($q) use ($search) {
                          $q->where('faunas.nameLat', 'like', "%{$search}%")
                            ->orWhere('faunas.nameId', 'like', "%{$search}%");
                      });
            }
            
            $burungnesiaCount = $query->count();
            return response()->json(['burungnesiaCount' => $burungnesiaCount]);
        } catch (\Exception $e) {
            \Log::error('Error in getBurungnesiaCount: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getKupunesiaCount(Request $request)
    {
        try {
            $query = DB::connection('third')->table('checklists');
            $query = $this->applyCommonFilters($query, $request);
            
            if ($request->has('search')) {
                $search = $request->search;
                $query->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                      ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                      ->where(function($q) use ($search) {
                          $q->where('faunas.nameLat', 'like', "%{$search}%")
                            ->orWhere('faunas.nameId', 'like', "%{$search}%");
                      });
            }
            
            $kupunesiaCount = $query->count();
            return response()->json(['kupunesiaCount' => $kupunesiaCount]);
        } catch (\Exception $e) {
            \Log::error('Error in getKupunesiaCount: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getFobiCount(Request $request)
    {
        try {
            $query = DB::table('fobi_checklist_taxas')
                ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id');

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('taxas.accepted_scientific_name', 'like', "%{$search}%")
                      ->orWhere('taxas.scientific_name', 'like', "%{$search}%")
                      ->orWhere('taxas.cname_species', 'like', "%{$search}%");
                });
            }

            $fobiCount = $query->distinct('fobi_checklist_taxas.id')->count('fobi_checklist_taxas.id');
            return response()->json(['fobiCount' => $fobiCount]);
        } catch (\Exception $e) {
            \Log::error('Error in getFobiCount: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getUserBurungnesiaCount($userId)
    {
        $userBurungnesiaCount = 0;
        $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();
        if ($fobiUser) {
            $secondCount = DB::connection('second')->table('checklists')
                ->where('user_id', $fobiUser->burungnesia_user_id)
                ->count();

            $fobiCount = DB::table('fobi_checklists')
                ->where('fobi_user_id', $userId)
                ->count();

            $userBurungnesiaCount = $secondCount + $fobiCount;
        }
        return response()->json(['userBurungnesiaCount' => $userBurungnesiaCount]);
    }

    public function getUserKupunesiaCount($userId)
    {
        $userKupunesiaCount = 0;
        $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();
        if ($fobiUser) {
            $thirdCount = DB::connection('third')->table('checklists')
                ->where('user_id', $fobiUser->kupunesia_user_id)
                ->count();

            $fobiKupnesCount = DB::table('fobi_checklists_kupnes')
                ->where('fobi_user_id', $userId)
                ->count();

            $userKupunesiaCount = $thirdCount + $fobiKupnesCount;
        }
        return response()->json(['userKupunesiaCount' => $userKupunesiaCount]);
    }

    public function getUserTotalObservations($userId)
    {
        $cacheKey = "user_total_observations_{$userId}";
        $cacheDuration = 30; // Cache selama 30 detik karena tidak ada polling

        return Cache::remember($cacheKey, $cacheDuration, function() use ($userId) {
            $userBurungnesiaCount = 0;
            $userKupunesiaCount = 0;
            $fobiCount = 0;

            $fobiUser = DB::table('fobi_users')->where('id', $userId)->first();

            if ($fobiUser) {
                $secondCount = DB::connection('second')
                    ->table('checklists')
                    ->where('user_id', $fobiUser->burungnesia_user_id)
                    ->count();

                $fobiBirdCount = DB::table('fobi_checklists')
                    ->where('fobi_user_id', $userId)
                    ->count();

                $userBurungnesiaCount = $secondCount + $fobiBirdCount;

                $thirdCount = DB::connection('third')
                    ->table('checklists')
                    ->where('user_id', $fobiUser->kupunesia_user_id)
                    ->count();

                $fobiKupnesCount = DB::table('fobi_checklists_kupnes')
                    ->where('fobi_user_id', $userId)
                    ->count();

                $userKupunesiaCount = $thirdCount + $fobiKupnesCount;
            }

            $fobiCount = DB::table('fobi_checklist_taxas')
                ->where('user_id', $userId)
                ->count();

            $total = $userBurungnesiaCount + $userKupunesiaCount + $fobiCount;

            return response()->json([
                'userTotalObservations' => $total,
                'timestamp' => now()->timestamp
            ]);
        });
    }

    public function getTotalSpecies(Request $request)
    {
        try {
            $query = DB::table('taxas')->where('taxon_rank', 'species');

            // Filter by species_id if provided
            if ($request->has('species_id')) {
                $query->where('id', $request->species_id);
            }

            // Filter by search if provided
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('accepted_scientific_name', 'like', "%{$search}%")
                      ->orWhere('scientific_name', 'like', "%{$search}%")
                      ->orWhere('cname_species', 'like', "%{$search}%");
                });
            }

            $totalSpecies = $query->count();
            return response()->json(['totalSpecies' => $totalSpecies]);
        } catch (\Exception $e) {
            \Log::error('Error in getTotalSpecies: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getTotalContributors(Request $request)
    {
        try {
            // Base query untuk fobi users
            $fobiUsersQuery = DB::table('fobi_users');
            
            // Query untuk users di database utama
            $mainUsersQuery = DB::table('users')
                ->whereNull('deleted_at');
                
            // Query untuk users di database second (Burungnesia)
            $burungnesiaUsersQuery = DB::connection('second')
                ->table('users')
                ->whereNull('deleted_at');
                
            // Query untuk users di database third (Kupunesia)
            $kupunesiaUsersQuery = DB::connection('third')
                ->table('users')
                ->whereNull('deleted_at');
            
            // Jika ada parameter search, terapkan filter
            if ($request->has('search')) {
                $search = $request->search;
                
                // Filter FOBI users
                $fobiUsersQuery->join('fobi_checklist_taxas', 'fobi_users.id', '=', 'fobi_checklist_taxas.user_id')
                    ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
                    ->where(function($q) use ($search) {
                        $q->where('taxas.accepted_scientific_name', 'like', "%{$search}%")
                          ->orWhere('taxas.scientific_name', 'like', "%{$search}%")
                          ->orWhere('taxas.cname_species', 'like', "%{$search}%");
                    })
                    ->distinct('fobi_users.id');
                    
                // Filter main users
                $mainUsersQuery->join('checklists', 'users.id', '=', 'checklists.user_id')
                    ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where(function($q) use ($search) {
                        $q->where('faunas.nameLat', 'like', "%{$search}%")
                          ->orWhere('faunas.nameInd', 'like', "%{$search}%");
                    })
                    ->distinct('users.id');
                    
                // Filter Burungnesia users
                $burungnesiaUsersQuery->join('checklists', 'users.id', '=', 'checklists.user_id')
                    ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where(function($q) use ($search) {
                        $q->where('faunas.nameLat', 'like', "%{$search}%")
                          ->orWhere('faunas.nameInd', 'like', "%{$search}%");
                    })
                    ->distinct('users.id');
                    
                // Filter Kupunesia users
                $kupunesiaUsersQuery->join('checklists', 'users.id', '=', 'checklists.user_id')
                    ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where(function($q) use ($search) {
                        $q->where('faunas.nameLat', 'like', "%{$search}%")
                          ->orWhere('faunas.nameInd', 'like', "%{$search}%");
                    })
                    ->distinct('users.id');
            }
            
            // Jika ada parameter shape, terapkan filter geografis
            if ($request->has('shape')) {
                $shape = $request->shape;
                
                // Filter FOBI users berdasarkan lokasi
                $fobiUsersQuery->join('fobi_checklists', 'fobi_users.id', '=', 'fobi_checklists.user_id')
                    ->whereNotNull('fobi_checklists.latitude')
                    ->whereNotNull('fobi_checklists.longitude');
                    
                if ($shape['type'] === 'Polygon') {
                    $coordinates = $shape['coordinates'][0];
                    $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                        return $point[0] . ' ' . $point[1];
                    }, $coordinates)) . '))';
                    
                    $fobiUsersQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(fobi_checklists.longitude, fobi_checklists.latitude))', [$polygonWKT]);
                } 
                else if ($shape['type'] === 'Circle') {
                    $center = $shape['center'];
                    $radius = $shape['radius'];
                    
                    $fobiUsersQuery->whereRaw("
                        ST_Distance_Sphere(
                            point(fobi_checklists.longitude, fobi_checklists.latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius]);
                }
                
                // Filter main users berdasarkan lokasi
                $mainUsersQuery->join('checklists', 'users.id', '=', 'checklists.user_id')
                    ->whereNotNull('checklists.latitude')
                    ->whereNotNull('checklists.longitude');
                    
                if ($shape['type'] === 'Polygon') {
                    $mainUsersQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
                } 
                else if ($shape['type'] === 'Circle') {
                    $mainUsersQuery->whereRaw("
                        ST_Distance_Sphere(
                            point(checklists.longitude, checklists.latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius]);
                }
                
                // Filter Burungnesia users berdasarkan lokasi
                $burungnesiaUsersQuery->join('checklists', 'users.id', '=', 'checklists.user_id')
                    ->whereNotNull('checklists.latitude')
                    ->whereNotNull('checklists.longitude');
                    
                if ($shape['type'] === 'Polygon') {
                    $burungnesiaUsersQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
                } 
                else if ($shape['type'] === 'Circle') {
                    $burungnesiaUsersQuery->whereRaw("
                        ST_Distance_Sphere(
                            point(checklists.longitude, checklists.latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius]);
                }
                
                // Filter Kupunesia users berdasarkan lokasi
                $kupunesiaUsersQuery->join('checklists', 'users.id', '=', 'checklists.user_id')
                    ->whereNotNull('checklists.latitude')
                    ->whereNotNull('checklists.longitude');
                    
                if ($shape['type'] === 'Polygon') {
                    $kupunesiaUsersQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
                } 
                else if ($shape['type'] === 'Circle') {
                    $kupunesiaUsersQuery->whereRaw("
                        ST_Distance_Sphere(
                            point(checklists.longitude, checklists.latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius]);
                }
            }
            
            // Ambil ID dari semua query
            $fobiUserIds = $fobiUsersQuery->pluck('fobi_users.id')->toArray();
            $mainUserIds = $mainUsersQuery->pluck('users.id')->toArray();
            $burungnesiaUserIds = $burungnesiaUsersQuery->pluck('users.id')->toArray();
            $kupunesiaUserIds = $kupunesiaUsersQuery->pluck('users.id')->toArray();
            
            // Ambil mapping ID untuk menghindari duplikasi
            $burungnesiaMapping = DB::table('fobi_users')
                ->whereNotNull('burungnesia_user_id')
                ->pluck('burungnesia_user_id')
                ->toArray();
                
            $kupunesiaMapping = DB::table('fobi_users')
                ->whereNotNull('kupunesia_user_id')
                ->pluck('kupunesia_user_id')
                ->toArray();
            
            // Filter ID yang sudah terhitung di FOBI
            $filteredBurungnesiaIds = array_diff($burungnesiaUserIds, $burungnesiaMapping);
            $filteredKupunesiaIds = array_diff($kupunesiaUserIds, $kupunesiaMapping);
            
            // Hitung total kontributor unik
            $totalContributors = count(array_unique(array_merge(
                $fobiUserIds,
                $mainUserIds,
                $filteredBurungnesiaIds,
                $filteredKupunesiaIds
            )));
            
            return response()->json(['totalContributors' => $totalContributors]);
        } catch (\Exception $e) {
            \Log::error('Error in getTotalContributors: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getGridContributors(Request $request) 
    {
        try {
            $checklistIds = $request->input('checklistIds', []);
            
            if (empty($checklistIds)) {
                return response()->json([
                    'status' => 'success',
                    'totalContributors' => 0
                ]);
            }

            \Log::info('Received checklist IDs:', $checklistIds);

            // Filter dan pisahkan ID berdasarkan prefix
            $burungnesiaIds = [];
            $kupunesiaIds = [];
            $fobiTaxaIds = [];
            $fobiChecklistIds = [];
            $fobiKupnesIds = [];
            
            foreach ($checklistIds as $id) {
                if (strpos($id, 'brn_') === 0) {
                    $burungnesiaIds[] = (int)str_replace('brn_', '', $id);
                } elseif (strpos($id, 'kpn_') === 0) {
                    $kupunesiaIds[] = (int)str_replace('kpn_', '', $id);
                } elseif (strpos($id, 'fob_fobi_t_') === 0) {
                    // Extract ID for fobi_checklist_taxas
                    $fobiTaxaIds[] = (int)str_replace('fob_fobi_t_', '', $id);
                } elseif (strpos($id, 'fob_fobi_c_') === 0) {
                    // Extract ID for fobi_checklists
                    $fobiChecklistIds[] = (int)str_replace('fob_fobi_c_', '', $id);
                } elseif (strpos($id, 'fob_fobi_k_') === 0) {
                    // Extract ID for fobi_checklists_kupnes
                    $fobiKupnesIds[] = (int)str_replace('fob_fobi_k_', '', $id);
                }
            }

            \Log::info('Filtered IDs:', [
                'burungnesia' => $burungnesiaIds,
                'kupunesia' => $kupunesiaIds,
                'fobi_taxa' => $fobiTaxaIds,
                'fobi_checklist' => $fobiChecklistIds,
                'fobi_kupnes' => $fobiKupnesIds
            ]);

            $allContributors = collect();

            // Get Burungnesia contributors
            if (!empty($burungnesiaIds)) {
                $secondContributors = DB::connection('second')
                    ->table('checklists')
                    ->whereIn('id', $burungnesiaIds)
                    ->distinct()
                    ->pluck('user_id');
                $allContributors = $allContributors->merge($secondContributors);
                \Log::info('Burungnesia contributors:', $secondContributors->toArray());
            }

            // Get Kupunesia contributors
            if (!empty($kupunesiaIds)) {
                $thirdContributors = DB::connection('third')
                    ->table('checklists')
                    ->whereIn('id', $kupunesiaIds)
                    ->distinct()
                    ->pluck('user_id');
                $allContributors = $allContributors->merge($thirdContributors);
                \Log::info('Kupunesia contributors:', $thirdContributors->toArray());
            }

            // Get FOBI taxa contributors
            if (!empty($fobiTaxaIds)) {
                $fobiTaxaContributors = DB::table('fobi_checklist_taxas')
                    ->whereIn('id', $fobiTaxaIds)
                    ->distinct()
                    ->pluck('user_id');
                $allContributors = $allContributors->merge($fobiTaxaContributors);
                \Log::info('FOBI taxa contributors:', $fobiTaxaContributors->toArray());
            }

            // Get FOBI checklist contributors
            if (!empty($fobiChecklistIds)) {
                $fobiChecklistContributors = DB::table('fobi_checklists')
                    ->whereIn('id', $fobiChecklistIds)
                    ->distinct()
                    ->pluck('fobi_user_id');
                $allContributors = $allContributors->merge($fobiChecklistContributors);
                \Log::info('FOBI checklist contributors:', $fobiChecklistContributors->toArray());
            }

            // Get FOBI kupnes contributors
            if (!empty($fobiKupnesIds)) {
                $fobiKupnesContributors = DB::table('fobi_checklists_kupnes')
                    ->whereIn('id', $fobiKupnesIds)
                    ->distinct()
                    ->pluck('fobi_user_id');
                $allContributors = $allContributors->merge($fobiKupnesContributors);
                \Log::info('FOBI kupnes contributors:', $fobiKupnesContributors->toArray());
            }

            $uniqueContributors = $allContributors->unique()->values();
            \Log::info('Total unique contributors:', ['count' => $uniqueContributors->count()]);

            return response()->json([
                'status' => 'success',
                'totalContributors' => $uniqueContributors->count()
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in getGridContributors: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getFilteredStats(Request $request)
    {
        try {
            // Query untuk Burungnesia
            $burungnesiaQuery = DB::connection('second')->table('checklists')
                ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id');

            // Query untuk Kupunesia
            $kupunesiaQuery = DB::connection('third')->table('checklists')
                ->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id');

            // Query untuk FOBI
            $fobiQuery = DB::table('fobi_checklist_taxas')
                ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id');

            // Terapkan filter polygon jika ada
            if ($request->has('polygon') && !empty($request->polygon)) {
                try {
                    $polygon = json_decode($request->polygon, true);
                    
                    if (isset($polygon['type'])) {
                        // Untuk tipe Polygon
                        if ($polygon['type'] === 'Polygon' && isset($polygon['coordinates']) && !empty($polygon['coordinates'])) {
                            $coordinates = $polygon['coordinates'][0]; // Ambil outer ring
                            
                            if (count($coordinates) >= 4) { // Minimal 4 titik (termasuk penutup)
                                $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                                    return $point[0] . ' ' . $point[1]; // lon lat
                                }, $coordinates)) . '))';
                                
                                $burungnesiaQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
                                $kupunesiaQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
                                $fobiQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude))', [$polygonWKT]);
                            }
                        }
                        // Untuk tipe Circle
                        else if ($polygon['type'] === 'Circle' && isset($polygon['center']) && isset($polygon['radius'])) {
                            $center = $polygon['center'];
                            $radius = $polygon['radius']; // dalam meter
                            
                            $burungnesiaQuery->whereRaw("
                                ST_Distance_Sphere(
                                    point(checklists.longitude, checklists.latitude),
                                    point(?, ?)
                                ) <= ?
                            ", [$center[0], $center[1], $radius]);
                            
                            $kupunesiaQuery->whereRaw("
                                ST_Distance_Sphere(
                                    point(checklists.longitude, checklists.latitude),
                                    point(?, ?)
                                ) <= ?
                            ", [$center[0], $center[1], $radius]);
                            
                            $fobiQuery->whereRaw("
                                ST_Distance_Sphere(
                                    point(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude),
                                    point(?, ?)
                                ) <= ?
                            ", [$center[0], $center[1], $radius]);
                        }
                    }
                } catch (\Exception $e) {
                    \Log::error('Error processing polygon in getFilteredStats: ' . $e->getMessage());
                }
            }

            // Filter berdasarkan species/taxa
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $burungnesiaQuery->where(function($q) use ($searchTerm) {
                    $q->where('faunas.nameLat', 'like', "%{$searchTerm}%")
                      ->orWhere('faunas.nameId', 'like', "%{$searchTerm}%");
                });
                $kupunesiaQuery->where(function($q) use ($searchTerm) {
                    $q->where('faunas.nameLat', 'like', "%{$searchTerm}%")
                      ->orWhere('faunas.nameId', 'like', "%{$searchTerm}%");
                });
                $fobiQuery->where(function($q) use ($searchTerm) {
                    $q->where('taxas.accepted_scientific_name', 'like', "%{$searchTerm}%")
                      ->orWhere('taxas.scientific_name', 'like', "%{$searchTerm}%")
                      ->orWhere('taxas.cname_species', 'like', "%{$searchTerm}%");
                });
            }

            // Filter berdasarkan data source
            if ($request->has('data_source') && is_array($request->data_source)) {
                $stats = [];
                
                if (in_array('burungnesia', $request->data_source)) {
                    $stats['burungnesia'] = $burungnesiaQuery->distinct('checklists.id')->count('checklists.id');
                } else {
                    $stats['burungnesia'] = 0;
                }
                
                if (in_array('kupunesia', $request->data_source)) {
                    $stats['kupunesia'] = $kupunesiaQuery->distinct('checklists.id')->count('checklists.id');
                } else {
                    $stats['kupunesia'] = 0;
                }
                
                if (in_array('fobi', $request->data_source)) {
                    $stats['fobi'] = $fobiQuery->distinct('fobi_checklist_taxas.id')->count('fobi_checklist_taxas.id');
                } else {
                    $stats['fobi'] = 0;
                }
            } else {
                $stats = [
                    'burungnesia' => $burungnesiaQuery->distinct('checklists.id')->count('checklists.id'),
                    'kupunesia' => $kupunesiaQuery->distinct('checklists.id')->count('checklists.id'),
                    'fobi' => $fobiQuery->distinct('fobi_checklist_taxas.id')->count('fobi_checklist_taxas.id'),
                ];
            }

            $stats['total'] = $stats['burungnesia'] + $stats['kupunesia'] + $stats['fobi'];

            // Hitung total species dengan filter yang sama
            $speciesQuery = DB::table('taxas')
                ->where('taxon_rank', 'species');
                
            if ($request->has('search') && !empty($request->search)) {
                $speciesQuery->where(function($q) use ($searchTerm) {
                    $q->where('scientific_name', 'like', "%{$searchTerm}%")
                      ->orWhere('accepted_scientific_name', 'like', "%{$searchTerm}%")
                      ->orWhere('cname_species', 'like', "%{$searchTerm}%");
                });
            }

            $stats['speciesCount'] = $speciesQuery->count();

            // Hitung total kontributor yang berkontribusi pada observasi terfilter
            $stats['contributorCount'] = DB::table('fobi_users')->count();

            // Tambahkan media count
            $stats['mediaCount'] = 0; // Isi dengan perhitungan media jika diperlukan

            // Return dalam format yang sesuai dengan filterStats.js
            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getFilteredStats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving filtered statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getPolygonStats(Request $request)
    {
        try {
            $shape = $request->input('shape', []);
            
            \Log::info('Received shape data: ' . json_encode($shape));
            
            if (empty($shape) || !isset($shape['type'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Shape data tidak valid'
                ], 400);
            }
            
            // Validasi format data
            if ($shape['type'] === 'Polygon' && (!isset($shape['coordinates']) || !is_array($shape['coordinates']) || empty($shape['coordinates'][0]))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format polygon tidak valid'
                ], 400);
            }
            
            if ($shape['type'] === 'Circle' && (!isset($shape['center']) || !isset($shape['radius']))) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format circle tidak valid'
                ], 400);
            }
            
            // Query untuk Burungnesia
            $burungnesiaQuery = DB::connection('second')->table('checklists')
                ->whereNotNull('latitude')
                ->whereNotNull('longitude');
                
            // Query untuk Kupunesia
            $kupunesiaQuery = DB::connection('third')->table('checklists')
                ->whereNotNull('latitude')
                ->whereNotNull('longitude');
                
            // Query untuk FOBI
            $fobiQuery = DB::table('fobi_checklist_taxas')
                ->whereNotNull('latitude')
                ->whereNotNull('longitude');
            
            // Terapkan filter polygon
            if ($shape['type'] === 'Polygon') {
                $coordinates = $shape['coordinates'][0];
                $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                    return $point[0] . ' ' . $point[1];
                }, $coordinates)) . '))';
                
                $burungnesiaQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT]);
                $kupunesiaQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT]);
                $fobiQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT]);
            } 
            else if ($shape['type'] === 'Circle') {
                $center = $shape['center'];
                $radius = $shape['radius']; // dalam meter
                
                // Gunakan ST_Distance_Sphere untuk Burungnesia
                $burungnesiaQuery->whereRaw("
                    ST_Distance_Sphere(
                        point(longitude, latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
                
                // Gunakan ST_Distance_Sphere untuk Kupunesia
                $kupunesiaQuery->whereRaw("
                    ST_Distance_Sphere(
                        point(longitude, latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
                
                // Gunakan ST_Distance_Sphere untuk FOBI
                $fobiQuery->whereRaw("
                    ST_Distance_Sphere(
                        point(longitude, latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
            }
            
            // Filter berdasarkan search jika ada
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                
                $burungnesiaQuery->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where(function($q) use ($searchTerm) {
                        $q->where('faunas.nameLat', 'like', "%{$searchTerm}%")
                          ->orWhere('faunas.nameId', 'like', "%{$searchTerm}%");
                    });
                    
                $kupunesiaQuery->join('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where(function($q) use ($searchTerm) {
                        $q->where('faunas.nameLat', 'like', "%{$searchTerm}%")
                          ->orWhere('faunas.nameId', 'like', "%{$searchTerm}%");
                    });
                    
                $fobiQuery->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
                    ->where(function($q) use ($searchTerm) {
                        $q->where('taxas.accepted_scientific_name', 'like', "%{$searchTerm}%")
                          ->orWhere('taxas.scientific_name', 'like', "%{$searchTerm}%")
                          ->orWhere('taxas.cname_species', 'like', "%{$searchTerm}%");
                    });
            } else {
                // Jika tidak ada search, tetap join dengan taxas untuk FOBI
                $fobiQuery->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id');
            }
            
            // Hitung jumlah observasi untuk masing-masing sumber data
            $burungnesiaCount = $burungnesiaQuery->distinct('checklists.id')->count('checklists.id');
            $kupunesiaCount = $kupunesiaQuery->distinct('checklists.id')->count('checklists.id');
            $fobiCount = $fobiQuery->distinct('fobi_checklist_taxas.id')->count('fobi_checklist_taxas.id');
            
            // Perbaiki perhitungan total spesies dalam polygon
            // Kita perlu menggabungkan spesies dari ketiga sumber data

            // 1. Spesies dari FOBI (sudah ada)
            $fobiSpeciesQuery = DB::table('taxas')
                ->where('taxon_rank', 'species')
                ->whereExists(function ($query) use ($shape) {
                    $query->from('fobi_checklist_taxas')
                        ->whereRaw('fobi_checklist_taxas.taxa_id = taxas.id')
                        ->whereNotNull('fobi_checklist_taxas.latitude')
                        ->whereNotNull('fobi_checklist_taxas.longitude');
                    
                    if ($shape['type'] === 'Polygon') {
                        $coordinates = $shape['coordinates'][0];
                        $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                            return $point[0] . ' ' . $point[1];
                        }, $coordinates)) . '))';
                        
                        $query->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude))', [$polygonWKT]);
                    } 
                    else if ($shape['type'] === 'Circle') {
                        $center = $shape['center'];
                        $radius = $shape['radius'];
                        
                        $query->whereRaw("
                            ST_Distance_Sphere(
                                point(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude),
                                point(?, ?)
                            ) <= ?
                        ", [$center[0], $center[1], $radius]);
                    }
                });

            // 2. Spesies dari Burungnesia - gunakan fauna_id langsung
            $burungnesiaSpeciesQuery = DB::connection('second')
                ->table('checklist_fauna')
                ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                ->whereNotNull('checklists.latitude')
                ->whereNotNull('checklists.longitude')
                ->select('faunas.id', 'faunas.nameLat');

            // Terapkan filter polygon untuk Burungnesia
            if ($shape['type'] === 'Polygon') {
                $coordinates = $shape['coordinates'][0];
                $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                    return $point[0] . ' ' . $point[1];
                }, $coordinates)) . '))';
                
                $burungnesiaSpeciesQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
            } 
            else if ($shape['type'] === 'Circle') {
                $center = $shape['center'];
                $radius = $shape['radius'];
                
                $burungnesiaSpeciesQuery->whereRaw("
                    ST_Distance_Sphere(
                        point(checklists.longitude, checklists.latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
            }

            // 3. Spesies dari Kupunesia - gunakan fauna_id langsung
            $kupunesiaSpeciesQuery = DB::connection('third')
                ->table('checklist_fauna')
                ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
                ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                ->whereNotNull('checklists.latitude')
                ->whereNotNull('checklists.longitude')
                ->select('faunas.id', 'faunas.nameLat');

            // Terapkan filter polygon untuk Kupunesia
            if ($shape['type'] === 'Polygon') {
                $coordinates = $shape['coordinates'][0];
                $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                    return $point[0] . ' ' . $point[1];
                }, $coordinates)) . '))';
                
                $kupunesiaSpeciesQuery->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
            } 
            else if ($shape['type'] === 'Circle') {
                $center = $shape['center'];
                $radius = $shape['radius'];
                
                $kupunesiaSpeciesQuery->whereRaw("
                    ST_Distance_Sphere(
                        point(checklists.longitude, checklists.latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
            }

            // Gabungkan semua query spesies
            $allSpeciesIds = collect();

            // Ambil ID spesies dari FOBI
            $fobiSpeciesIds = $fobiSpeciesQuery->pluck('id');
            $allSpeciesIds = $allSpeciesIds->concat($fobiSpeciesIds);

            // Ambil ID spesies dari Burungnesia
            $burungnesiaSpeciesIds = $burungnesiaSpeciesQuery->pluck('id');
            $allSpeciesIds = $allSpeciesIds->concat($burungnesiaSpeciesIds);

            // Ambil ID spesies dari Kupunesia
            $kupunesiaSpeciesIds = $kupunesiaSpeciesQuery->pluck('id');
            $allSpeciesIds = $allSpeciesIds->concat($kupunesiaSpeciesIds);

            // Hitung total spesies unik
            $totalSpecies = $allSpeciesIds->unique()->count();
            
            // Hitung total kontributor dalam polygon
            $fobiContributors = DB::table('fobi_users')
                ->select('fobi_users.id')
                ->join('fobi_checklist_taxas', 'fobi_users.id', '=', 'fobi_checklist_taxas.user_id')
                ->whereNotNull('fobi_checklist_taxas.latitude')
                ->whereNotNull('fobi_checklist_taxas.longitude');
                
            // Terapkan filter polygon untuk FOBI
            if ($shape['type'] === 'Polygon') {
                $coordinates = $shape['coordinates'][0];
                $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                    return $point[0] . ' ' . $point[1];
                }, $coordinates)) . '))';
                
                $fobiContributors->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude))', [$polygonWKT]);
            } 
            else if ($shape['type'] === 'Circle') {
                $center = $shape['center'];
                $radius = $shape['radius']; // dalam meter
                
                $fobiContributors->whereRaw("
                    ST_Distance_Sphere(
                        point(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
            }
            
            // 2. Kontributor dari database utama
            $mainContributors = DB::table('users')
                ->select('users.id')
                ->join('checklists', 'users.id', '=', 'checklists.user_id')
                ->whereNull('users.deleted_at')
                ->whereNotNull('checklists.latitude')
                ->whereNotNull('checklists.longitude');
                
            // Terapkan filter polygon untuk main users
            if ($shape['type'] === 'Polygon') {
                $mainContributors->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
            } 
            else if ($shape['type'] === 'Circle') {
                $mainContributors->whereRaw("
                    ST_Distance_Sphere(
                        point(checklists.longitude, checklists.latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
            }

            // 3. Kontributor dari Burungnesia
            $burungnesiaContributors = DB::connection('second')
                ->table('users')
                ->select('users.id')
                ->join('checklists', 'users.id', '=', 'checklists.user_id')
                ->whereNull('users.deleted_at')
                ->whereNotNull('checklists.latitude')
                ->whereNotNull('checklists.longitude');
                
            // Terapkan filter polygon untuk Burungnesia
            if ($shape['type'] === 'Polygon') {
                $burungnesiaContributors->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
            } 
            else if ($shape['type'] === 'Circle') {
                $burungnesiaContributors->whereRaw("
                    ST_Distance_Sphere(
                        point(checklists.longitude, checklists.latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
            }

            // 4. Kontributor dari Kupunesia
            $kupunesiaContributors = DB::connection('third')
                ->table('users')
                ->select('users.id')
                ->join('checklists', 'users.id', '=', 'checklists.user_id')
                ->whereNull('users.deleted_at')
                ->whereNotNull('checklists.latitude')
                ->whereNotNull('checklists.longitude');
                
            // Terapkan filter polygon untuk Kupunesia
            if ($shape['type'] === 'Polygon') {
                $kupunesiaContributors->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
            } 
            else if ($shape['type'] === 'Circle') {
                $kupunesiaContributors->whereRaw("
                    ST_Distance_Sphere(
                        point(checklists.longitude, checklists.latitude),
                        point(?, ?)
                    ) <= ?
                ", [$center[0], $center[1], $radius]);
            }

            // 5. Kontributor dari FOBI yang terhubung dengan Burungnesia
            $fobiBurungnesiaContributors = DB::table('fobi_users')
                ->select('fobi_users.id');

            // Gunakan whereExists untuk join dengan database lain
            $fobiBurungnesiaContributors->whereExists(function($query) use ($shape) {
                $query->select(DB::raw(1))
                    ->from(DB::connection('second')->getDatabaseName() . '.checklists')
                    ->whereRaw('fobi_users.burungnesia_user_id = checklists.user_id')
                    ->whereNotNull('checklists.latitude')
                    ->whereNotNull('checklists.longitude');
                
                // Terapkan filter polygon
                if ($shape['type'] === 'Polygon') {
                    $coordinates = $shape['coordinates'][0];
                    $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                        return $point[0] . ' ' . $point[1];
                    }, $coordinates)) . '))';
                    
                    $query->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
                } 
                else if ($shape['type'] === 'Circle') {
                    $center = $shape['center'];
                    $radius = $shape['radius'];
                    
                    $query->whereRaw("
                        ST_Distance_Sphere(
                            point(checklists.longitude, checklists.latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius]);
                }
            });

            // 6. Kontributor dari FOBI yang terhubung dengan Kupunesia
            $fobiKupunesiaContributors = DB::table('fobi_users')
                ->select('fobi_users.id');

            // Gunakan whereExists untuk join dengan database lain
            $fobiKupunesiaContributors->whereExists(function($query) use ($shape) {
                $query->select(DB::raw(1))
                    ->from(DB::connection('third')->getDatabaseName() . '.checklists')
                    ->whereRaw('fobi_users.kupunesia_user_id = checklists.user_id')
                    ->whereNotNull('checklists.latitude')
                    ->whereNotNull('checklists.longitude');
                
                // Terapkan filter polygon
                if ($shape['type'] === 'Polygon') {
                    $coordinates = $shape['coordinates'][0];
                    $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                        return $point[0] . ' ' . $point[1];
                    }, $coordinates)) . '))';
                    
                    $query->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(checklists.longitude, checklists.latitude))', [$polygonWKT]);
                } 
                else if ($shape['type'] === 'Circle') {
                    $center = $shape['center'];
                    $radius = $shape['radius'];
                    
                    $query->whereRaw("
                        ST_Distance_Sphere(
                            point(checklists.longitude, checklists.latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius]);
                }
            });

            // Ambil ID dari semua query
            $fobiUserIds = $fobiContributors->pluck('id')->toArray();
            $mainUserIds = $mainContributors->pluck('id')->toArray();
            $burungnesiaUserIds = $burungnesiaContributors->pluck('id')->toArray();
            $kupunesiaUserIds = $kupunesiaContributors->pluck('id')->toArray();
            $fobiBurungnesiaUserIds = $fobiBurungnesiaContributors->pluck('id')->toArray();
            $fobiKupunesiaUserIds = $fobiKupunesiaContributors->pluck('id')->toArray();

            // Ambil mapping ID untuk menghindari duplikasi
            $burungnesiaMapping = DB::table('fobi_users')
                ->whereNotNull('burungnesia_user_id')
                ->pluck('burungnesia_user_id')
                ->toArray();
                
            $kupunesiaMapping = DB::table('fobi_users')
                ->whereNotNull('kupunesia_user_id')
                ->pluck('kupunesia_user_id')
                ->toArray();

            // Filter ID yang sudah terhitung di FOBI
            $filteredBurungnesiaIds = array_diff($burungnesiaUserIds, $burungnesiaMapping);
            $filteredKupunesiaIds = array_diff($kupunesiaUserIds, $kupunesiaMapping);

            // Hitung total kontributor unik
            $totalContributors = count(array_unique(array_merge(
                $fobiUserIds,
                $mainUserIds,
                $filteredBurungnesiaIds,
                $filteredKupunesiaIds,
                $fobiBurungnesiaUserIds,
                $fobiKupunesiaUserIds
            )));
            
            // Siapkan data statistik
            $stats = [
                'burungnesia' => $burungnesiaCount,
                'kupunesia' => $kupunesiaCount,
                'fobi' => $fobiCount,
                'observasi' => $burungnesiaCount + $kupunesiaCount + $fobiCount,
                'spesies' => $totalSpecies,
                'kontributor' => $totalContributors
            ];
            
            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error in getPolygonStats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getGridSpeciesCount(Request $request)
    {
        try {
            $checklistIds = $request->input('checklistIds', []);
            
            if (empty($checklistIds)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No checklist IDs provided'
                ]);
            }
            
            $burungnesiaIds = [];
            $kupunesiaIds = [];
            $fobiIds = [];
            
            // Pisahkan ID berdasarkan prefix
            foreach ($checklistIds as $id) {
                if (strpos($id, 'brn_') === 0) {
                    $burungnesiaIds[] = str_replace('brn_', '', $id);
                } elseif (strpos($id, 'kpn_') === 0) {
                    $kupunesiaIds[] = str_replace('kpn_', '', $id);
                } elseif (strpos($id, 'fob_') === 0) {
                    $fobiIds[] = str_replace('fob_', '', $id);
                }
            }
            
            // Ambil spesies dari Burungnesia
            $burungnesiaSpecies = collect();
            if (!empty($burungnesiaIds)) {
                $burungnesiaSpecies = DB::connection('second')
                    ->table('checklist_fauna')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->whereIn('checklist_fauna.checklist_id', $burungnesiaIds)
                    ->select('faunas.nameLat')
                    ->distinct()
                    ->get()
                    ->pluck('nameLat');
            }
            
            // Ambil spesies dari Kupunesia
            $kupunesiaSpecies = collect();
            if (!empty($kupunesiaIds)) {
                $kupunesiaSpecies = DB::connection('third')
                    ->table('checklist_fauna')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->whereIn('checklist_fauna.checklist_id', $kupunesiaIds)
                    ->select('faunas.nameLat')
                    ->distinct()
                    ->get()
                    ->pluck('nameLat');
            }
            
            // Ambil spesies dari FOBI
            $fobiSpecies = collect();
            if (!empty($fobiIds)) {
                $fobiSpecies = DB::table('fobi_checklist_taxas')
                    ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
                    ->whereIn('fobi_checklist_taxas.id', $fobiIds)
                    ->select('taxas.scientific_name as nameLat')
                    ->distinct()
                    ->get()
                    ->pluck('nameLat');
            }
            
            // Gabungkan semua spesies dan hitung yang unik
            $allSpecies = $burungnesiaSpecies->concat($kupunesiaSpecies)->concat($fobiSpecies);
            $uniqueSpeciesCount = $allSpecies->unique()->count();
            
            return response()->json([
                'status' => 'success',
                'totalSpecies' => $uniqueSpeciesCount
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error in getGridSpeciesCount: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getGridsInPolygon(Request $request)
    {
        try {
            $shape = $request->input('shape');
            if (!$shape) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Shape data is required'
                ], 400);
            }
            
            // Ambil semua grid yang berada dalam polygon
            $grids = [];
            
            // Jika polygon
            if ($shape['type'] === 'Polygon') {
                $coordinates = $shape['coordinates'][0];
                $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                    return $point[0] . ' ' . $point[1];
                }, $coordinates)) . '))';
                
                // Ambil data dari Burungnesia
                $burungnesiaPoints = DB::connection('second')
                    ->table('checklists')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                    
                // Ambil data dari Kupunesia
                $kupunesiaPoints = DB::connection('third')
                    ->table('checklists')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                    
                // Ambil data dari FOBI
                $fobiPoints = DB::table('fobi_checklists')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                    
                // Tambahkan data FOBI Checklist Taxas
                $fobiTaxaPoints = DB::table('fobi_checklist_taxas')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                
                // Gabungkan semua titik dan kelompokkan berdasarkan grid
                $allPoints = collect()
                    ->merge($burungnesiaPoints->map(function($item) {
                        return [
                            'id' => 'brn_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }))
                    ->merge($kupunesiaPoints->map(function($item) {
                        return [
                            'id' => 'kpn_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }))
                    ->merge($fobiPoints->map(function($item) {
                        return [
                            'id' => 'fob_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }))
                    ->merge($fobiTaxaPoints->map(function($item) {
                        return [
                            'id' => 'fobt_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }));
                
                // Kelompokkan titik-titik ke dalam grid
                $gridSize = 0.1; // Ukuran grid dalam derajat
                $gridPoints = [];
                
                foreach ($allPoints as $point) {
                    // Hitung grid ID berdasarkan koordinat
                    $gridLat = floor($point['lat'] / $gridSize) * $gridSize;
                    $gridLng = floor($point['lng'] / $gridSize) * $gridSize;
                    $gridId = $gridLat . '_' . $gridLng;
                    
                    if (!isset($gridPoints[$gridId])) {
                        $gridPoints[$gridId] = [
                            'id' => $gridId,
                            'center' => [$gridLng + ($gridSize/2), $gridLat + ($gridSize/2)],
                            'points' => []
                        ];
                    }
                    
                    $gridPoints[$gridId]['points'][] = $point['id'];
                }
                
                $grids = array_values($gridPoints);
            } 
            // Jika circle
            else if ($shape['type'] === 'Circle') {
                $center = $shape['center'];
                $radius = $shape['radius']; // dalam meter
                
                // Ambil data dari Burungnesia
                $burungnesiaPoints = DB::connection('second')
                    ->table('checklists')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw("
                        ST_Distance_Sphere(
                            point(longitude, latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                    
                // Ambil data dari Kupunesia
                $kupunesiaPoints = DB::connection('third')
                    ->table('checklists')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw("
                        ST_Distance_Sphere(
                            point(longitude, latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                    
                // Ambil data dari FOBI
                $fobiPoints = DB::table('fobi_checklists')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw("
                        ST_Distance_Sphere(
                            point(longitude, latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                    
                // Tambahkan data FOBI Checklist Taxas
                $fobiTaxaPoints = DB::table('fobi_checklist_taxas')
                    ->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw("
                        ST_Distance_Sphere(
                            point(longitude, latitude),
                            point(?, ?)
                        ) <= ?
                    ", [$center[0], $center[1], $radius])
                    ->select('id', 'latitude', 'longitude')
                    ->get();
                
                // Gabungkan semua titik dan kelompokkan berdasarkan grid
                $allPoints = collect()
                    ->merge($burungnesiaPoints->map(function($item) {
                        return [
                            'id' => 'brn_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }))
                    ->merge($kupunesiaPoints->map(function($item) {
                        return [
                            'id' => 'kpn_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }))
                    ->merge($fobiPoints->map(function($item) {
                        return [
                            'id' => 'fob_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }))
                    ->merge($fobiTaxaPoints->map(function($item) {
                        return [
                            'id' => 'fobt_' . $item->id,
                            'lat' => $item->latitude,
                            'lng' => $item->longitude
                        ];
                    }));
                
                // Kelompokkan titik-titik ke dalam grid
                $gridSize = 0.1; // Ukuran grid dalam derajat
                $gridPoints = [];
                
                foreach ($allPoints as $point) {
                    // Hitung grid ID berdasarkan koordinat
                    $gridLat = floor($point['lat'] / $gridSize) * $gridSize;
                    $gridLng = floor($point['lng'] / $gridSize) * $gridSize;
                    $gridId = $gridLat . '_' . $gridLng;
                    
                    if (!isset($gridPoints[$gridId])) {
                        $gridPoints[$gridId] = [
                            'id' => $gridId,
                            'center' => [$gridLng + ($gridSize/2), $gridLat + ($gridSize/2)],
                            'points' => []
                        ];
                    }
                    
                    $gridPoints[$gridId]['points'][] = $point['id'];
                }
                
                $grids = array_values($gridPoints);
            }
            
            return response()->json([
                'status' => 'success',
                'gridsInPolygon' => $grids
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getGridsInPolygon: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getGridData($gridId)
    {
        try {
            // Parse grid ID untuk mendapatkan koordinat
            $parts = explode('_', $gridId);
            if (count($parts) !== 2) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid grid ID format'
                ], 400);
            }
            
            $gridLat = (float)$parts[0];
            $gridLng = (float)$parts[1];
            $gridSize = 0.1; // Ukuran grid dalam derajat
            
            // Hitung batas grid
            $minLat = $gridLat;
            $maxLat = $gridLat + $gridSize;
            $minLng = $gridLng;
            $maxLng = $gridLng + $gridSize;
            
            // Ambil data dari Burungnesia (tanpa media)
            $burungnesiaData = DB::connection('second')
                ->table('checklists')
                ->join('users', 'checklists.user_id', '=', 'users.id')
                ->leftJoin('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                ->leftJoin('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                ->whereNotNull('checklists.latitude')
                ->whereNotNull('checklists.longitude')
                ->whereBetween('checklists.latitude', [$minLat, $maxLat])
                ->whereBetween('checklists.longitude', [$minLng, $maxLng])
                ->select(
                    'checklists.id',
                    'faunas.nameLat as species',
                    'faunas.nameId as local_name',
                    'checklists.created_at as date',
                    'users.uname as observer',
                    DB::raw("'burungnesia' as source")
                )
                ->get();
                
            // Ambil data dari Kupunesia (tanpa media)
            $kupunesiaData = DB::connection('third')
                ->table('checklists')
                ->join('users', 'checklists.user_id', '=', 'users.id')
                ->leftJoin('checklist_fauna', 'checklists.id', '=', 'checklist_fauna.checklist_id')
                ->leftJoin('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                ->whereNotNull('checklists.latitude')
                ->whereNotNull('checklists.longitude')
                ->whereBetween('checklists.latitude', [$minLat, $maxLat])
                ->whereBetween('checklists.longitude', [$minLng, $maxLng])
                ->select(
                    'checklists.id',
                    'faunas.nameLat as species',
                    'faunas.nameId as local_name',
                    'checklists.created_at as date',
                    'users.uname as observer',
                    DB::raw("'kupunesia' as source")
                )
                ->get();
                
            // Ambil data dari FOBI Checklists (tanpa media)
            $fobiData = DB::table('fobi_checklists')
                ->join('fobi_users', 'fobi_checklists.fobi_user_id', '=', 'fobi_users.id') // Menggunakan fobi_user_id bukan user_id
                ->whereNotNull('fobi_checklists.latitude')
                ->whereNotNull('fobi_checklists.longitude')
                ->whereBetween('fobi_checklists.latitude', [$minLat, $maxLat])
                ->whereBetween('fobi_checklists.longitude', [$minLng, $maxLng])
                ->select(
                    'fobi_checklists.id',
                    DB::raw("'Unknown Species' as species"),
                    DB::raw("'Spesies Tidak Diketahui' as local_name"),
                    'fobi_checklists.created_at as date',
                    'fobi_users.uname as observer',
                    DB::raw("'fobi' as source")
                )
                ->get();
                
            // Ambil data dari FOBI Checklist Taxas
            $fobiTaxaData = DB::table('fobi_checklist_taxas')
                ->join('fobi_users', 'fobi_checklist_taxas.user_id', '=', 'fobi_users.id') // user_id sudah benar
                ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
                ->whereNotNull('fobi_checklist_taxas.latitude')
                ->whereNotNull('fobi_checklist_taxas.longitude')
                ->whereBetween('fobi_checklist_taxas.latitude', [$minLat, $maxLat])
                ->whereBetween('fobi_checklist_taxas.longitude', [$minLng, $maxLng])
                ->select(
                    'fobi_checklist_taxas.id',
                    'taxas.scientific_name as species',
                    'taxas.cname_species as local_name',
                    'fobi_checklist_taxas.created_at as date',
                    'fobi_users.uname as observer',
                    DB::raw("'fobi' as source")
                )
                ->get();
                
            // Ambil media untuk FOBI Checklist Taxas
            $fobiTaxaIds = $fobiTaxaData->pluck('id')->toArray();
            $fobiMediaData = [];
            
            if (!empty($fobiTaxaIds)) {
                $fobiMediaData = DB::table('fobi_media')
                    ->whereIn('checklist_id', $fobiTaxaIds)
                    ->select('checklist_id', 'file_path as url', 'media_type as type')
                    ->get()
                    ->groupBy('checklist_id')
                    ->toArray();
            }
            
            // Proses data
            $processedData = [];
            
            // Proses Burungnesia data (tanpa media)
            foreach ($burungnesiaData as $item) {
                $id = 'brn_' . $item->id;
                $processedData[$id] = [
                    'id' => $id,
                    'species' => $item->species,
                    'local_name' => $item->local_name,
                    'date' => $item->date,
                    'observer' => $item->observer,
                    'source' => $item->source,
                    'media' => [] // Array kosong untuk media
                ];
            }
            
            // Proses Kupunesia data (tanpa media)
            foreach ($kupunesiaData as $item) {
                $id = 'kpn_' . $item->id;
                $processedData[$id] = [
                    'id' => $id,
                    'species' => $item->species,
                    'local_name' => $item->local_name,
                    'date' => $item->date,
                    'observer' => $item->observer,
                    'source' => $item->source,
                    'media' => [] // Array kosong untuk media
                ];
            }
            
            // Proses FOBI data (tanpa media)
            foreach ($fobiData as $item) {
                $id = 'fob_' . $item->id;
                $processedData[$id] = [
                    'id' => $id,
                    'species' => $item->species,
                    'local_name' => $item->local_name,
                    'date' => $item->date,
                    'observer' => $item->observer,
                    'source' => $item->source,
                    'media' => [] // Array kosong untuk media
                ];
            }
            
            // Proses FOBI Taxa data (dengan media)
            foreach ($fobiTaxaData as $item) {
                $id = 'fobt_' . $item->id;
                $processedData[$id] = [
                    'id' => $id,
                    'species' => $item->species,
                    'local_name' => $item->local_name,
                    'date' => $item->date,
                    'observer' => $item->observer,
                    'source' => $item->source,
                    'media' => []
                ];
                
                // Tambahkan media jika ada
                if (isset($fobiMediaData[$item->id])) {
                    foreach ($fobiMediaData[$item->id] as $media) {
                        $processedData[$id]['media'][] = [
                            'url' => $media->url,
                            'type' => $media->type
                        ];
                    }
                }
            }
            
            return response()->json([
                'status' => 'success',
                'data' => array_values($processedData)
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getGridData: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
