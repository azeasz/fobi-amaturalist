<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class FobiMarkerController extends Controller
{
    public function getMarkers(Request $request)
    {
        try {
            $query = DB::table('fobi_checklists');
            $queryKupunes = DB::table('fobi_checklists_kupnes');
            $queryTaxa = DB::table('fobi_checklist_taxas');

            // Handle spatial search
            if ($request->has('shape')) {
                $shape = json_decode($request->shape, true);
                
                if ($shape['type'] === 'Polygon') {
                    $coordinates = $shape['coordinates'][0];
                    $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                        return $point[0] . ' ' . $point[1];
                    }, $coordinates)) . '))';
                    
                    $query->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT]);
                    $queryKupunes->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT]);
                    $queryTaxa->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(longitude, latitude))', [$polygonWKT]);
                } 
                else if ($shape['type'] === 'Circle') {
                    $center = $shape['center'];
                    $radius = $shape['radius']; // in meters
                    
                    $haversine = "(6371000 * acos(cos(radians(?)) 
                        * cos(radians(latitude)) 
                        * cos(radians(longitude) - radians(?)) 
                        + sin(radians(?)) 
                        * sin(radians(latitude))))";
                    
                    $query->whereRaw("{$haversine} <= ?", [$center[1], $center[0], $center[1], $radius]);
                    $queryKupunes->whereRaw("{$haversine} <= ?", [$center[1], $center[0], $center[1], $radius]);
                    $queryTaxa->whereRaw("{$haversine} <= ?", [$center[1], $center[0], $center[1], $radius]);
                }
            }

            // Filter berdasarkan sumber data
            if ($request->has('data_source')) {
                $sources = $request->data_source;
                if (!in_array('fobi', $sources)) {
                    return response()->json([]);
                }
            }

            // Filter berdasarkan tanggal
            if ($request->has('start_date')) {
                $query->where('created_at', '>=', $request->start_date);
                $queryKupunes->where('created_at', '>=', $request->start_date);
                $queryTaxa->where('created_at', '>=', $request->start_date);
            }

            if ($request->has('end_date')) {
                $query->where('created_at', '<=', $request->end_date);
                $queryKupunes->where('created_at', '<=', $request->end_date);
                $queryTaxa->where('created_at', '<=', $request->end_date);
            }

            // Filter berdasarkan grade
            if ($request->has('grade') && !empty($request->grade)) {
                $query->whereIn('grade', $request->grade);
                $queryKupunes->whereIn('grade', $request->grade);
                $queryTaxa->whereIn('grade', $request->grade);
            }

            // Filter berdasarkan media
            if ($request->has('has_media') && $request->has_media) {
                $query->whereNotNull('media_url');
                $queryKupunes->whereNotNull('media_url');
                $queryTaxa->whereNotNull('media_url');
            }

            if ($request->has('media_type')) {
                $query->where('media_type', $request->media_type);
                $queryKupunes->where('media_type', $request->media_type);
                $queryTaxa->where('media_type', $request->media_type);
            }

            // Filter berdasarkan lokasi dan radius
            if ($request->has(['latitude', 'longitude', 'radius'])) {
                $lat = $request->latitude;
                $lon = $request->longitude;
                $radius = $request->radius;

                $haversine = "(6371 * acos(cos(radians($lat))
                    * cos(radians(latitude))
                    * cos(radians(longitude) - radians($lon))
                    + sin(radians($lat))
                    * sin(radians(latitude))))";

                $query->whereRaw("{$haversine} <= ?", [$radius]);
                $queryKupunes->whereRaw("{$haversine} <= ?", [$radius]);
                $queryTaxa->whereRaw("{$haversine} <= ?", [$radius]);
            }

            // Ambil data sesuai filter
            $checklistsBurungnesia = $query->select(
                'latitude',
                'longitude',
                DB::raw("CONCAT('fobi_b_', id) as id"),
                'created_at',
                DB::raw("'burungnesia_fobi' as source")
            )->get();

            $checklistsKupunesia = $queryKupunes->select(
                'latitude',
                'longitude',
                DB::raw("CONCAT('fobi_k_', id) as id"),
                'created_at',
                DB::raw("'kupunesia_fobi' as source")
            )->get();

            $checklistsTaxa = $queryTaxa->select(
                'latitude',
                'longitude',
                DB::raw("CONCAT('fobi_t_', id) as id"),
                'created_at',
                DB::raw("'taxa_fobi' as source")
            )->get();

            $markers = $checklistsBurungnesia
                ->concat($checklistsKupunesia)
                ->concat($checklistsTaxa);

            return response()->json($markers);
        } catch (\Exception $e) {
            \Log::error('Error in FobiMarkerController:', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getSpeciesInChecklist($checklist_id, $source)
    {
        try {
            $id = str_replace(['fobi_b_', 'fobi_k_', 'fobi_t_'], '', $checklist_id);
            
            if (strpos($checklist_id, 'fobi_b_') === 0) {
                // Query untuk FOBI Burungnesia
                $checklistData = DB::table('fobi_checklists as fc')
                    ->leftJoin('fobi_users as fu', 'fc.fobi_user_id', '=', 'fu.id')
                    ->where('fc.id', $id)
                    ->select([
                        'fc.id',
                        'fc.latitude',
                        'fc.longitude',
                        DB::raw('COALESCE(fc.tgl_pengamatan, fc.created_at) as observation_date'),
                        DB::raw("COALESCE(CONCAT(TRIM(fu.fname), ' ', TRIM(fu.lname)), fu.uname, 'Tidak diketahui') as observer_name"),
                        'fu.uname',
                        'fc.additional_note as observation_details',
                        'fu.id as observer_id',
                        'fc.created_at'
                    ])
                    ->first();

                // Query species untuk FOBI Burungnesia
                $species = DB::table('fobi_checklist_faunasv1 as fcf')
                    ->join('faunas as f', 'fcf.fauna_id', '=', 'f.id')
                    ->where('fcf.checklist_id', $id)
                    ->select([
                        'f.id',
                        'f.nameLat',
                        'f.nameId',
                        'fcf.count',
                        'fcf.notes'
                    ])
                    ->get();

            } elseif (strpos($checklist_id, 'fobi_k_') === 0) {
                // Query untuk FOBI Kupunesia
                $checklistData = DB::table('fobi_checklists_kupnes as fck')
                    ->leftJoin('fobi_users as fu', 'fck.fobi_user_id', '=', 'fu.id')
                    ->where('fck.id', $id)
                    ->select([
                        'fck.id',
                        'fck.latitude',
                        'fck.longitude',
                        DB::raw('COALESCE(fck.tgl_pengamatan, fck.created_at) as observation_date'),
                        DB::raw("CONCAT(COALESCE(fu.fname, ''), ' ', COALESCE(fu.lname, '')) as observer_name"),
                        'fu.uname',
                        'fck.additional_note as observation_details',
                        'fu.id as observer_id'
                    ])
                    ->first();

                // Query species untuk FOBI Kupunesia
                $species = DB::table('fobi_checklist_faunasv2 as fcf')
                    ->join('faunas_kupnes as f', 'fcf.fauna_id', '=', 'f.id')
                    ->where('fcf.checklist_id', $id)
                    ->select([
                        'f.id',
                        'f.nameLat',
                        'f.nameId',
                        'fcf.count',
                        'fcf.notes'
                    ])
                    ->get();

            } else {
                // Query untuk FOBI Taxa (kode yang sudah ada)
                $checklistData = DB::table('fobi_checklist_taxas as fct')
                    ->leftJoin('fobi_users as fu', 'fct.user_id', '=', 'fu.id')
                    ->where('fct.id', $id)
                    ->select([
                        'fct.id',
                        'fct.latitude',
                        'fct.longitude',
                        DB::raw('COALESCE(fct.date, fct.created_at) as observation_date'),
                        DB::raw("CONCAT(COALESCE(fu.fname, ''), ' ', COALESCE(fu.lname, '')) as observer_name"),
                        'fu.uname',
                        'fct.observation_details',
                        'fct.scientific_name',
                        'fct.species',
                        'fu.id as observer_id'
                    ])
                    ->first();

                // Query species untuk FOBI Taxa
                $species = DB::table('fobi_checklist_taxas as fct')
                    ->leftJoin('taxas as t', 'fct.taxa_id', '=', 't.id')
                    ->where('fct.id', $id)
                    ->select([
                        'fct.id',
                        DB::raw('COALESCE(t.scientific_name, fct.scientific_name) as nameLat'),
                        DB::raw('COALESCE(t.cname_species, fct.species) as nameId'),
                        DB::raw('1 as count'),
                        'fct.observation_details as notes'
                    ])
                    ->get();
            }

            // Format tanggal dan observer untuk semua sumber
            if ($checklistData) {
                // Format observer name
                $checklistData->observer_name = trim($checklistData->observer_name) ?: 'Tidak diketahui';
                
                // Format tanggal
                if ($checklistData->observation_date) {
                    try {
                        $date = new \DateTime($checklistData->observation_date);
                        $checklistData->observation_date = $date->format('Y-m-d H:i:s');
                    } catch (\Exception $e) {
                        $checklistData->observation_date = date('Y-m-d H:i:s', strtotime($checklistData->created_at));
                    }
                } else {
                    $checklistData->observation_date = date('Y-m-d H:i:s', strtotime($checklistData->created_at));
                }
            }

            // Fallback jika tidak ada species
            if ($species->isEmpty() && $checklistData) {
                $species = collect([
                    [
                        'id' => $checklistData->id,
                        'nameLat' => $checklistData->scientific_name ?? 'Species tidak diketahui',
                        'nameId' => $checklistData->species ?? 'Nama umum tidak tersedia',
                        'count' => 1,
                        'notes' => $checklistData->observation_details
                    ]
                ]);
            }

            return response()->json([
                'checklist' => $checklistData,
                'species' => $species
            ]);

        } catch (\Exception $e) {
            \Log::error('Error in getSpeciesInChecklist:', [
                'error' => $e->getMessage(),
                'checklist_id' => $checklist_id,
                'source' => $source,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getMarkersByTaxa(Request $request)
    {
        try {
            $taxaId = $request->taxa_id;
            if (!$taxaId) {
                return response()->json([]);
            }

            // Get taxa data first
            $taxaData = DB::table('taxas')
                ->where('id', $taxaId)
                ->select('id', 'burnes_fauna_id', 'kupnes_fauna_id')
                ->first();

            if (!$taxaData) {
                return response()->json([]);
            }

            // Query untuk fobi_checklist_faunasv1 (burungnesia)
            $burungnesiaMarkers = DB::table('fobi_checklists')
                ->join('fobi_checklist_faunasv1', 'fobi_checklists.id', '=', 'fobi_checklist_faunasv1.checklist_id')
                ->where('fobi_checklist_faunasv1.fauna_id', $taxaData->burnes_fauna_id)
                ->whereNotNull('fobi_checklists.latitude')
                ->whereNotNull('fobi_checklists.longitude')
                ->select(
                    'fobi_checklists.latitude',
                    'fobi_checklists.longitude',
                    DB::raw("CONCAT('fobi_b_', fobi_checklists.id) as id"),
                    'fobi_checklists.created_at',
                    DB::raw("'burungnesia_fobi' as source")
                );

            // Query untuk fobi_checklist_faunasv2 (kupunesia)
            $kupunesiaMarkers = DB::table('fobi_checklists_kupnes')
                ->join('fobi_checklist_faunasv2', 'fobi_checklists_kupnes.id', '=', 'fobi_checklist_faunasv2.checklist_id')
                ->where('fobi_checklist_faunasv2.fauna_id', $taxaData->kupnes_fauna_id)
                ->whereNotNull('fobi_checklists_kupnes.latitude')
                ->whereNotNull('fobi_checklists_kupnes.longitude')
                ->select(
                    'fobi_checklists_kupnes.latitude',
                    'fobi_checklists_kupnes.longitude',
                    DB::raw("CONCAT('fobi_k_', fobi_checklists_kupnes.id) as id"),
                    'fobi_checklists_kupnes.created_at',
                    DB::raw("'kupunesia_fobi' as source")
                );

            // Query untuk taxa
            $taxaMarkers = DB::table('fobi_checklist_taxas')
                ->where('taxa_id', $taxaId)
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->select(
                    'latitude',
                    'longitude',
                    DB::raw("CONCAT('fobi_t_', id) as id"),
                    'created_at',
                    DB::raw("'taxa_fobi' as source")
                );

            // Gabungkan semua hasil
            $markers = $burungnesiaMarkers
                ->union($kupunesiaMarkers)
                ->union($taxaMarkers)
                ->get();

            return response()->json($markers);
        } catch (\Exception $e) {
            \Log::error('Error in getMarkersByTaxa:', [
                'error' => $e->getMessage(),
                'taxa_id' => $request->taxa_id
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // Perbaikan method getFobiStats untuk menghitung semua sumber FOBI
    public function getFobiStats()
    {
        try {
            // Hitung observasi dari semua sumber FOBI
            $fobiTaxaCount = DB::table('fobi_checklist_taxas')
                ->whereNull('deleted_at')
                ->count();
            
            $fobiBurungnesiaCount = DB::table('fobi_checklists')
                ->whereNull('deleted_at')
                ->count();
            
            $fobiKupunesiaCount = DB::table('fobi_checklists_kupnes')
                ->whereNull('deleted_at')
                ->count();

            // Hitung kontributor unik dari semua sumber
            $kontributorCount = DB::table('fobi_users as fu')
                ->leftJoin('fobi_checklist_taxas as fct', 'fu.id', '=', 'fct.user_id')
                ->leftJoin('fobi_checklists as fc', 'fu.id', '=', 'fc.user_id')
                ->leftJoin('fobi_checklists_kupnes as fck', 'fu.id', '=', 'fck.user_id')
                ->whereNull('fct.deleted_at')
                ->whereNull('fc.deleted_at')
                ->whereNull('fck.deleted_at')
                ->whereNotNull(DB::raw('COALESCE(fct.id, fc.id, fck.id)'))
                ->distinct('fu.id')
                ->count('fu.id');

            // Hitung spesies unik
            $speciesCount = DB::table(DB::raw('(
                SELECT scientific_name FROM fobi_checklist_taxas WHERE deleted_at IS NULL
                UNION
                SELECT f.nameLat FROM fobi_checklist_faunasv1 fcf1
                JOIN faunas f ON fcf1.fauna_id = f.id
                JOIN fobi_checklists fc ON fcf1.checklist_id = fc.id
                WHERE fc.deleted_at IS NULL
                UNION
                SELECT f.nameLat FROM fobi_checklist_faunasv2 fcf2
                JOIN faunas_kupnes f ON fcf2.fauna_id = f.id
                JOIN fobi_checklists_kupnes fck ON fcf2.checklist_id = fck.id
                WHERE fck.deleted_at IS NULL
            ) as unique_species'))
                ->count();

            $stats = [
                'observasi' => $fobiTaxaCount + $fobiBurungnesiaCount + $fobiKupunesiaCount,
                'kontributor' => $kontributorCount,
                'spesies' => $speciesCount
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            \Log::error('Error getting FOBI stats:', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
