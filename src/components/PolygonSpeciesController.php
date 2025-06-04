<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PolygonSpeciesController extends Controller
{
    public function getSpeciesInPolygon(Request $request)
    {
        try {
            if (!$request->has('shape')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Shape parameter is required'
                ], 400);
            }

            $shape = json_decode($request->shape, true);
            $allSpecies = collect();

            // Ambil data dari Burungnesia
            $burungnesiaSpecies = $this->getBurungnesiaSpeciesInPolygon($shape);
            $allSpecies = $allSpecies->concat($burungnesiaSpecies);

            // Ambil data dari Kupunesia
            $kupunesiaSpecies = $this->getKupunesiaSpeciesInPolygon($shape);
            $allSpecies = $allSpecies->concat($kupunesiaSpecies);

            // Ambil data dari FOBI
            $fobiSpecies = $this->getFobiSpeciesInPolygon($shape);
            $allSpecies = $allSpecies->concat($fobiSpecies);

            // Kelompokkan berdasarkan nama latin untuk menghindari duplikasi
            $groupedSpecies = $allSpecies->groupBy('nameLat')->map(function ($group) {
                $first = $group->first();
                // Konversi stdClass ke array
                $firstArray = (array)$first;
                return [
                    'nameLat' => $firstArray['nameLat'],
                    'nameId' => $firstArray['nameId'],
                    'id' => $firstArray['id'],
                    'count' => $group->sum('count'),
                    'source' => $firstArray['source'],
                    'observation_date' => $firstArray['observation_date'] ?? null,
                    'observer_name' => $firstArray['observer_name'] ?? null,
                    'checklist_id' => $firstArray['checklist_id'] ?? null
                ];
            })->values();

            // Log untuk debugging
            \Log::info('Polygon species counts:', [
                'total_species' => $groupedSpecies->count(),
                'shape_type' => $shape['type']
            ]);

            return response()->json($groupedSpecies);
        } catch (\Exception $e) {
            \Log::error('Error in PolygonSpeciesController:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function getBurungnesiaSpeciesInPolygon($shape)
    {
        $query = DB::connection('second')
            ->table('checklist_fauna')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
            ->join('users', 'checklists.user_id', '=', 'users.id')
            ->whereNotNull('checklists.latitude')
            ->whereNotNull('checklists.longitude')
            ->select(
                'faunas.nameId',
                'faunas.nameLat',
                DB::raw("CONCAT('brn_', faunas.id) as id"),
                DB::raw('SUM(checklist_fauna.count) as count'),
                DB::raw('NULL as notes'),
                'checklists.created_at as observation_date',
                'users.uname as observer_name',
                DB::raw("'burungnesia' as source"),
                'checklists.id as checklist_id'
            )
            ->groupBy('faunas.nameId', 'faunas.nameLat', 'faunas.id', 'checklists.created_at', 'users.uname', 'checklists.id');

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
            $radius = $shape['radius']; // in meters
            
            $haversine = "(6371000 * acos(cos(radians(?)) 
                * cos(radians(checklists.latitude)) 
                * cos(radians(checklists.longitude) - radians(?)) 
                + sin(radians(?)) 
                * sin(radians(checklists.latitude))))";
            
            $query->whereRaw("{$haversine} <= ?", [$center[1], $center[0], $center[1], $radius]);
        }

        return $query->get();
    }

    private function getKupunesiaSpeciesInPolygon($shape)
    {
        $query = DB::connection('third')
            ->table('checklist_fauna')
            ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
            ->join('checklists', 'checklist_fauna.checklist_id', '=', 'checklists.id')
            ->join('users', 'checklists.user_id', '=', 'users.id')
            ->whereNotNull('checklists.latitude')
            ->whereNotNull('checklists.longitude')
            ->select(
                'faunas.nameId',
                'faunas.nameLat',
                DB::raw("CONCAT('kpn_', faunas.id) as id"),
                DB::raw('SUM(checklist_fauna.count) as count'),
                DB::raw('NULL as notes'),
                'checklists.created_at as observation_date',
                'users.uname as observer_name',
                DB::raw("'kupunesia' as source"),
                'checklists.id as checklist_id'
            )
            ->groupBy('faunas.nameId', 'faunas.nameLat', 'faunas.id', 'checklists.created_at', 'users.uname', 'checklists.id');

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
            $radius = $shape['radius']; // in meters
            
            $haversine = "(6371000 * acos(cos(radians(?)) 
                * cos(radians(checklists.latitude)) 
                * cos(radians(checklists.longitude) - radians(?)) 
                + sin(radians(?)) 
                * sin(radians(checklists.latitude))))";
            
            $query->whereRaw("{$haversine} <= ?", [$center[1], $center[0], $center[1], $radius]);
        }

        return $query->get();
    }

    private function getFobiSpeciesInPolygon($shape)
    {
        $query = DB::table('fobi_checklist_taxas')
            ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
            ->join('fobi_users', 'fobi_checklist_taxas.user_id', '=', 'fobi_users.id')
            ->whereNotNull('fobi_checklist_taxas.latitude')
            ->whereNotNull('fobi_checklist_taxas.longitude')
            ->select(
                'taxas.cname_species as nameId',
                'taxas.accepted_scientific_name as nameLat',
                'taxas.id',
                DB::raw('1 as count'),
                'fobi_checklist_taxas.observation_details as notes',
                DB::raw('COALESCE(fobi_checklist_taxas.date, fobi_checklist_taxas.created_at) as observation_date'),
                'fobi_users.uname as observer_name',
                DB::raw("'fobi' as source"),
                'fobi_checklist_taxas.id as checklist_id'
            );

        // Terapkan filter polygon
        if ($shape['type'] === 'Polygon') {
            $coordinates = $shape['coordinates'][0];
            $polygonWKT = 'POLYGON((' . implode(',', array_map(function($point) {
                return $point[0] . ' ' . $point[1];
            }, $coordinates)) . '))';
            
            $query->whereRaw('ST_Contains(ST_GeomFromText(?), POINT(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude))', [$polygonWKT]);
        } 
        else if ($shape['type'] === 'Circle') {
            $center = $shape['center'];
            $radius = $shape['radius']; // in meters
            
            $haversine = "(6371000 * acos(cos(radians(?)) 
                * cos(radians(fobi_checklist_taxas.latitude)) 
                * cos(radians(fobi_checklist_taxas.longitude) - radians(?)) 
                + sin(radians(?)) 
                * sin(radians(fobi_checklist_taxas.latitude))))";
            
            $query->whereRaw("{$haversine} <= ?", [$center[1], $center[0], $center[1], $radius]);
        }

        return $query->get();
    }
} 