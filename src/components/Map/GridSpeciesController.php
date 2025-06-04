<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GridSpeciesController extends Controller
{
    public function getSpeciesInChecklist($checklist_id)
    {
        try {
            \Log::info('Processing checklist_id:', ['id' => $checklist_id]);

            $checklistData = null;
            $species = collect();
            $originalId = null;

            // Ekstrak ID asli dari checklist_id
            if (strpos($checklist_id, 'brn_') === 0) {
                $originalId = str_replace('brn_', '', $checklist_id);
                \Log::info('Extracted Burungnesia ID:', ['original_id' => $originalId]);
            } elseif (strpos($checklist_id, 'kpn_') === 0) {
                $originalId = str_replace('kpn_', '', $checklist_id);
                \Log::info('Extracted Kupunesia ID:', ['original_id' => $originalId]);
            } elseif (strpos($checklist_id, 'fobi_') === 0) {
                $originalId = str_replace('fobi_', '', $checklist_id);
                if (strpos($originalId, 'k_') === 0) {
                    $originalId = str_replace('k_', '', $originalId);
                } elseif (strpos($originalId, 't_') === 0) {
                    $originalId = str_replace('t_', '', $originalId);
                }
                \Log::info('Extracted FOBI ID:', ['original_id' => $originalId]);
            }

            if (!$originalId) {
                throw new Exception('Invalid checklist ID format');
            }

            if (strpos($checklist_id, 'brn_') === 0) {
                \Log::info('Fetching Burungnesia data:', ['id' => $originalId]);
                
                // Fetch checklist data
                $checklistData = DB::connection('second')
                    ->table('checklists')
                    ->where('id', $originalId)
                    ->select(
                        'latitude',
                        'longitude',
                        'observer',
                        DB::raw('DATE_FORMAT(tgl_pengamatan, "%Y-%m-%d %H:%i:%s") as tgl_pengamatan'),
                        DB::raw('DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at'),
                        'additional_note'
                    )
                    ->first();

                \Log::info('Burungnesia checklist data:', ['data' => $checklistData]);
                
                // Fetch species data
                $species = DB::connection('second')
                    ->table('checklist_fauna')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where('checklist_fauna.checklist_id', $originalId)
                    ->select(
                        'faunas.nameId',
                        'faunas.nameLat',
                        DB::raw("CONCAT('brn_', faunas.id) as id"),
                        'checklist_fauna.count',
                        DB::raw('NULL as notes')
                    )
                    ->get();

                \Log::info('Burungnesia species data:', ['count' => $species->count()]);
            } 
            elseif (strpos($checklist_id, 'kpn_') === 0) {
                \Log::info('Fetching Kupunesia data:', ['id' => $originalId]);
                
                // Khusus untuk Kupunesia, gunakan koneksi 'third'
                $checklistData = DB::connection('third')
                    ->table('checklists')
                    ->where('id', $originalId)
                    ->select(
                        'latitude',
                        'longitude',
                        'observer',
                        DB::raw('DATE_FORMAT(tgl_pengamatan, "%Y-%m-%d %H:%i:%s") as tgl_pengamatan'),
                        DB::raw('DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at'),
                        'additional_note'
                    )
                    ->first();

                \Log::info('Kupunesia checklist data:', ['data' => $checklistData]);
                
                $species = DB::connection('third')
                    ->table('checklist_fauna')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where('checklist_fauna.checklist_id', $originalId)
                    ->select(
                        'faunas.nameId',
                        'faunas.nameLat',
                        DB::raw("CONCAT('kpn_', faunas.id) as id"),
                        'checklist_fauna.count',
                        DB::raw('NULL as notes')
                    )
                    ->get();

                \Log::info('Kupunesia species data:', ['count' => $species->count()]);
            }
            elseif (strpos($checklist_id, 'fobi_') === 0) {
                if (strpos($checklist_id, 'fobi_k_') === 0) {
                    \Log::info('Fetching FOBI Kupunesia data:', ['id' => $originalId]);
                    
                    $checklistData = DB::table('fobi_checklists_kupnes')
                        ->where('id', $originalId)
                        ->select(
                            'latitude',
                            'longitude',
                            'observer',
                            DB::raw('DATE_FORMAT(tgl_pengamatan, "%Y-%m-%d %H:%i:%s") as tgl_pengamatan'),
                            DB::raw('DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at'),
                            'additional_note'
                        )
                        ->first();

                    \Log::info('FOBI Kupunesia checklist data:', ['data' => $checklistData]);
                    
                    $species = DB::table('fobi_checklist_faunasv2')
                        ->join('faunas_kupnes', 'fobi_checklist_faunasv2.fauna_id', '=', 'faunas_kupnes.id')
                        ->where('fobi_checklist_faunasv2.checklist_id', $originalId)
                        ->select(
                            'faunas_kupnes.nameId',
                            'faunas_kupnes.nameLat',
                            DB::raw("CONCAT('fobi_k_', faunas_kupnes.id) as id"),
                            'fobi_checklist_faunasv2.count',
                            'fobi_checklist_faunasv2.notes'
                        )
                        ->get();

                    \Log::info('FOBI Kupunesia species data:', ['count' => $species->count()]);
                }
                elseif (strpos($checklist_id, 'fobi_t_') === 0) {
                    \Log::info('Fetching FOBI Taxa data:', ['id' => $originalId]);
                    
                    $checklistData = DB::table('fobi_checklist_taxas')
                        ->where('id', $originalId)
                        ->select(
                            'latitude',
                            'longitude',
                            'observer',
                            DB::raw('DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as tgl_pengamatan'),
                            DB::raw('DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at'),
                            'observation_details as additional_note'
                        )
                        ->first();

                    \Log::info('FOBI Taxa checklist data:', ['data' => $checklistData]);
                    
                    $species = DB::table('fobi_checklist_taxas')
                        ->where('id', $originalId)
                        ->select(
                            'species as nameId',
                            'scientific_name as nameLat',
                            DB::raw("CONCAT('fobi_t_', id) as id"),
                            DB::raw('1 as count'),
                            'observation_details as notes'
                        )
                        ->get();

                    \Log::info('FOBI Taxa species data:', ['count' => $species->count()]);
                }
            }

            \Log::info('Final response:', [
                'checklist_id' => $checklist_id,
                'source' => strpos($checklist_id, 'kpn_') === 0 ? 'kupunesia' : 
                           (strpos($checklist_id, 'brn_') === 0 ? 'burungnesia' : 'fobi'),
                'species_count' => $species->count(),
                'has_checklist' => !is_null($checklistData)
            ]);

            return response()->json([
                'checklist' => $checklistData,
                'species' => $species
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in GridSpeciesController:', [
                'error' => $e->getMessage(),
                'checklist_id' => $checklist_id
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
