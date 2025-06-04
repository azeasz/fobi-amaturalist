<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ChecklistDetailController extends Controller
{
    public function getDetail($id)
    {
        try {
            $source = request()->query('source', 'fobi');
            $actualId = $this->getActualId($id, $source);

            $checklist = null;
            $fauna = null;
            $images = null;
            $sounds = collect();

            if ($source === 'burungnesia') {
                // Cek di database utama
                $checklist = DB::table('fobi_checklists as fc')
                    ->join('fobi_users as fu', 'fc.fobi_user_id', '=', 'fu.id')
                    ->select([
                        'fc.*',
                        'fu.uname as username'
                    ])
                    ->where('fc.id', $actualId)
                    ->first();

                if (!$checklist) {
                    // Cek di database second
                    $checklist = DB::connection('second')
                        ->table('checklists as fc')
                        ->join('users as fu', 'fc.user_id', '=', 'fu.id')
                        ->select([
                            DB::raw("CONCAT('BNAPP', fc.id) as id"),
                            'fc.user_id as fobi_user_id',
                            'fc.observer',
                            'fc.latitude',
                            'fc.longitude',
                            'fc.tgl_pengamatan',
                            'fc.start_time',
                            'fc.end_time',
                            'fc.additional_note',
                            'fc.created_at',
                            'fc.updated_at',
                            'fu.uname as username'
                        ])
                        ->where('fc.id', $actualId)
                        ->first();

                    if ($checklist) {
                        // Ambil fauna dari database second dengan prefix BNAPP
                        $fauna = DB::connection('second')
                            ->table('checklist_fauna as fcf')
                            ->select([
                                DB::raw("CONCAT('BNAPP', fcf.checklist_id) as checklist_id"),
                                DB::raw("CONCAT('BNAPP', fcf.fauna_id) as fauna_id"),
                                'fcf.count as jumlah',
                                'fcf.notes as catatan',
                                'fcf.breeding',
                                'fcf.breeding_note',
                                'f.nameId as nama_lokal',
                                'f.nameLat as nama_ilmiah',
                                'f.family'
                            ])
                            ->join('faunas as f', 'fcf.fauna_id', '=', 'f.id')
                            ->where('fcf.checklist_id', $actualId)
                            ->whereNull('fcf.deleted_at')
                            ->get();
                    }
                } else {
                    // Ambil fauna dari database utama
                    $fauna = DB::table('fobi_checklist_faunasv1 as fcf')
                        ->select([
                            'fcf.checklist_id',
                            'fcf.fauna_id',
                            'fcf.count as jumlah',
                            'fcf.notes as catatan',
                            'fcf.breeding',
                            'fcf.breeding_note',
                            'f.nameId as nama_lokal',
                            'f.nameLat as nama_ilmiah',
                            'f.family'
                        ])
                        ->join('faunas as f', 'fcf.fauna_id', '=', 'f.id')
                        ->where('fcf.checklist_id', $actualId)
                        ->whereNull('fcf.deleted_at')
                        ->get();
                }

                $sounds = DB::table('fobi_checklist_sounds')
                    ->select([
                        'id',
                        'sounds as url',
                        'spectrogram',
                        'checklist_id',
                        'fauna_id',
                        'status',
                        'created_at',
                        'updated_at'
                    ])
                    ->where('checklist_id', $actualId)
                    ->whereNull('deleted_at')
                    ->get();

            } elseif ($source === 'kupunesia') {
                // Cek di database utama
                $checklist = DB::table('fobi_checklists_kupnes as fc')
                    ->join('fobi_users as fu', 'fc.fobi_user_id', '=', 'fu.id')
                    ->select([
                        'fc.*',
                        'fu.uname as username'
                    ])
                    ->where('fc.id', $actualId)
                    ->first();

                if (!$checklist) {
                    // Cek di database third
                    $checklist = DB::connection('third')
                        ->table('checklists as fc')
                        ->join('users as fu', 'fc.user_id', '=', 'fu.id')
                        ->select([
                            DB::raw("CONCAT('KPAPP', fc.id) as id"),
                            'fc.user_id as fobi_user_id',
                            'fc.observer',
                            'fc.latitude',
                            'fc.longitude',
                            'fc.tgl_pengamatan',
                            'fc.start_time',
                            'fc.end_time',
                            'fc.additional_note',
                            'fc.created_at',
                            'fc.updated_at',
                            'fu.uname as username'
                        ])
                        ->where('fc.id', $actualId)
                        ->first();

                    if ($checklist) {
                        $breedingTypes = DB::connection('third')
                            ->table('breeding_type')
                            ->select(['id', 'type as name'])
                            ->whereNull('deleted_at')
                            ->pluck('name', 'id');

                        // Ambil fauna dari database third dengan prefix KPAPP
                        $fauna = DB::connection('third')
                            ->table('checklist_fauna as fcf')
                            ->select([
                                DB::raw("CONCAT('KPAPP', fcf.checklist_id) as checklist_id"),
                                DB::raw("CONCAT('KPAPP', fcf.fauna_id) as fauna_id"),
                                'fcf.count as jumlah',
                                'fcf.notes as catatan',
                                'fcf.breeding',
                                'fcf.breeding_note',
                                'fcf.breeding_type_id',
                                'f.nameId as nama_lokal',
                                'f.nameLat as nama_ilmiah',
                                'f.family'
                            ])
                            ->join('faunas as f', 'fcf.fauna_id', '=', 'f.id')
                            ->where('fcf.checklist_id', $actualId)
                            ->whereNull('fcf.deleted_at')
                            ->get()
                            ->map(function($item) use ($breedingTypes) {
                                $item->breeding_type_name = $item->breeding_type_id ?
                                    $breedingTypes->get($item->breeding_type_id) : null;
                                return $item;
                            });
                    }
                } else {
                    // Ambil fauna dari database utama
                    $breedingTypes = DB::connection('third')
                        ->table('breeding_type')
                        ->select(['id', 'type as name'])
                        ->whereNull('deleted_at')
                        ->pluck('name', 'id');

                    $fauna = DB::table('fobi_checklist_faunasv2 as fcf')
                        ->select([
                            'fcf.checklist_id',
                            'fcf.fauna_id',
                            'fcf.count as jumlah',
                            'fcf.notes as catatan',
                            'fcf.breeding',
                            'fcf.breeding_note',
                            'fcf.breeding_type_id',
                            'f.nameId as nama_lokal',
                            'f.nameLat as nama_ilmiah',
                            'f.family'
                        ])
                        ->join('faunas_kupnes as f', 'fcf.fauna_id', '=', 'f.id')
                        ->where('fcf.checklist_id', $actualId)
                        ->whereNull('fcf.deleted_at')
                        ->get()
                        ->map(function($item) use ($breedingTypes) {
                            $item->breeding_type_name = $item->breeding_type_id ?
                                $breedingTypes->get($item->breeding_type_id) : null;
                            return $item;
                        });
                }
            }

            // Cek images sesuai dengan source
            if ($source === 'kupunesia') {
                // Cek di database utama dulu
                $images = DB::table('fobi_checklist_fauna_imgs_kupnes')
                    ->select([
                        'id',
                        'images as url',
                        'checklist_id',
                        'fauna_id',
                        'created_at',
                        'updated_at'
                    ])
                    ->where('checklist_id', $actualId)
                    ->whereNull('deleted_at')
                    ->get();

                if (!$images->count()) {
                    // Jika tidak ada, cek di database third
                    $images = DB::connection('third')
                        ->table('checklist_fauna_imgs')
                        ->select([
                            'id',
                            'images as url',
                            'checklist_id',
                            'fauna_id',
                            'created_at',
                            'updated_at'
                        ])
                        ->where('checklist_id', $actualId)
                        ->whereNull('deleted_at')
                        ->get();
                }
            } else {
                // Untuk burungnesia, hanya cek di database utama
                $images = DB::table('fobi_checklist_fauna_imgs')
                    ->select([
                        'id',
                        'images as url',
                        'checklist_id',
                        'fauna_id',
                        'created_at',
                        'updated_at'
                    ])
                    ->where('checklist_id', $actualId)
                    ->whereNull('deleted_at')
                    ->get();
            }

            if (!$checklist) {
                return response()->json([
                    'success' => false,
                    'message' => 'Checklist tidak ditemukan'
                ], 404);
            }

            // Hitung total observasi user
            $totalObservations = 0;
            if ($source === 'burungnesia') {
                // Ambil data user dari fobi_users
                $fobiUser = DB::table('fobi_users')
                    ->where('id', $checklist->fobi_user_id)
                    ->first();

                if ($fobiUser) {
                    // Hitung observasi dari burungnesia (second database)
                    $secondCount = DB::connection('second')
                        ->table('checklists')
                        ->where('user_id', $fobiUser->burungnesia_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    // Hitung observasi dari fobi birds
                    $fobiBirdCount = DB::table('fobi_checklists')
                        ->where('fobi_user_id', $checklist->fobi_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    $burungnesiaCount = $secondCount + $fobiBirdCount;

                    // Hitung observasi dari kupunesia
                    $thirdCount = DB::connection('third')
                        ->table('checklists')
                        ->where('user_id', $fobiUser->kupunesia_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    $fobiKupnesCount = DB::table('fobi_checklists_kupnes')
                        ->where('fobi_user_id', $checklist->fobi_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    $kupunesiaCount = $thirdCount + $fobiKupnesCount;

                    // Hitung observasi dari taxa
                    $taxaCount = DB::table('fobi_checklist_taxas')
                        ->where('user_id', $checklist->fobi_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    // Total keseluruhan
                    $totalObservations = $burungnesiaCount + $kupunesiaCount + $taxaCount;
                }

            } elseif ($source === 'kupunesia') {
                // Ambil data user dari fobi_users
                $fobiUser = DB::table('fobi_users')
                    ->where('id', $checklist->fobi_user_id)
                    ->first();

                if ($fobiUser) {
                    // Hitung observasi dari burungnesia (second database)
                    $secondCount = DB::connection('second')
                        ->table('checklists')
                        ->where('user_id', $fobiUser->burungnesia_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    // Hitung observasi dari fobi birds
                    $fobiBirdCount = DB::table('fobi_checklists')
                        ->where('fobi_user_id', $checklist->fobi_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    $burungnesiaCount = $secondCount + $fobiBirdCount;

                    // Hitung observasi dari kupunesia
                    $thirdCount = DB::connection('third')
                        ->table('checklists')
                        ->where('user_id', $fobiUser->kupunesia_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    $fobiKupnesCount = DB::table('fobi_checklists_kupnes')
                        ->where('fobi_user_id', $checklist->fobi_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    $kupunesiaCount = $thirdCount + $fobiKupnesCount;

                    // Hitung observasi dari taxa
                    $taxaCount = DB::table('fobi_checklist_taxas')
                        ->where('user_id', $checklist->fobi_user_id)
                        ->whereNull('deleted_at')
                        ->count();

                    // Total keseluruhan
                    $totalObservations = $burungnesiaCount + $kupunesiaCount + $taxaCount;
                }
            }

            $response = [
                'success' => true,
                'data' => [
                    'checklist' => [
                        'id' => $checklist->id,
                        'username' => $checklist->username,
                        'observer' => $checklist->observer,
                        'latitude' => $checklist->latitude,
                        'longitude' => $checklist->longitude,
                        'tgl_pengamatan' => $checklist->tgl_pengamatan,
                        'start_time' => $checklist->start_time,
                        'end_time' => $checklist->end_time,
                        'additional_note' => $checklist->additional_note,
                        'total_observations' => $totalObservations,
                    ],
                    'fauna' => $fauna->map(function($f) use ($source) {
                        $data = [
                            'id' => $f->fauna_id,
                            'checklist_id' => $f->checklist_id,
                            'nama_lokal' => $f->nama_lokal,
                            'nama_ilmiah' => $f->nama_ilmiah,
                            'family' => $f->family,
                            'jumlah' => $f->jumlah,
                            'catatan' => $f->catatan,
                            'breeding' => $f->breeding,
                            'breeding_note' => $f->breeding_note
                        ];

                        if ($source === 'kupunesia' && isset($f->breeding_type_name)) {
                            $data['breeding_type_name'] = $f->breeding_type_name;
                        }

                        return $data;
                    }),
                    'media' => [
                        'images' => $images->map(function($img) {
                            return [
                                'id' => $img->id,
                                'url' => $img->url,
                                'checklist_id' => $img->checklist_id,
                                'fauna_id' => $img->fauna_id
                            ];
                        }),
                        'sounds' => $sounds->map(function($sound) {
                            return [
                                'id' => $sound->id,
                                'url' => $sound->url,
                                'spectrogram' => $sound->spectrogram,
                                'checklist_id' => $sound->checklist_id,
                                'fauna_id' => $sound->fauna_id,
                                'status' => $sound->status
                            ];
                        })
                    ]
                ]
            ];

            return response()->json($response);

        } catch (\Exception $e) {
            Log::error('Error in getDetail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil detail checklist'
            ], 500);
        }
    }

    /**
     * Update checklist dan fauna
     */
    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $source = request()->query('source', 'fobi');
            $actualId = $this->getActualId($id, $source);

            Log::info('Update request:', [
                'source' => $source,
                'actualId' => $actualId,
                'request_data' => $request->all()
            ]);

            // Validate request
            $request->validate([
                'tgl_pengamatan' => 'required|date',
                'start_time' => 'required',
                'end_time' => 'required',
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
                'fauna' => 'array',
                'fauna.*.id' => 'required|integer',
                'fauna.*.count' => 'required|integer|min:0',
                'fauna.*.notes' => 'nullable|string',
                'fauna.*.breeding' => 'boolean',
                'fauna.*.breeding_note' => 'nullable|string',
                'fauna.*.breeding_type_id' => 'nullable|integer'
            ]);

            // Update checklist
            $table = $source === 'kupunesia' ? 'fobi_checklists_kupnes' : 'fobi_checklists';
            $checklistUpdate = DB::table($table)
                ->where('id', $actualId)
                ->update([
                    'tgl_pengamatan' => $request->tgl_pengamatan,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'additional_note' => $request->additional_note,
                    'updated_at' => now()
                ]);

            Log::info('Checklist update result:', ['updated' => $checklistUpdate]);

            // Update fauna
            $faunaTable = $source === 'kupunesia' ? 'fobi_checklist_faunasv2' : 'fobi_checklist_faunasv1';
            foreach ($request->fauna as $fauna) {
                $updateData = [
                    'count' => $fauna['count'],
                    'notes' => $fauna['notes'],
                    'breeding' => $fauna['breeding'],
                    'breeding_note' => $fauna['breeding_note'],
                    'updated_at' => now()
                ];

                if ($source === 'kupunesia' && isset($fauna['breeding_type_id'])) {
                    $updateData['breeding_type_id'] = $fauna['breeding_type_id'];
                }

                $faunaUpdate = DB::table($faunaTable)
                    ->where([
                        'checklist_id' => $actualId,
                        'fauna_id' => $fauna['id']
                    ])
                    ->update($updateData);

                Log::info('Fauna update result:', [
                    'fauna_id' => $fauna['id'],
                    'updated' => $faunaUpdate,
                    'update_data' => $updateData
                ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Checklist berhasil diperbarui'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in update: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui checklist: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete entire checklist
     */
    public function destroy($id)
    {
        try {
            $user = auth()->user();
            $source = request()->query('source', 'fobi');
            $actualId = $this->getActualId($id, $source);

            if (!$this->canModifyChecklist($user, $actualId, $source)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            DB::beginTransaction();

            if ($source === 'burungnesia') {
                // Soft delete related records
                DB::table('fobi_checklist_faunasv1')
                    ->where('checklist_id', $actualId)
                    ->update(['deleted_at' => now()]);

                DB::table('fobi_checklist_fauna_imgs')
                    ->where('checklist_id', $actualId)
                    ->update(['deleted_at' => now()]);

                DB::table('fobi_checklist_sounds')
                    ->where('checklist_id', $actualId)
                    ->update(['deleted_at' => now()]);

                // Soft delete checklist
                DB::table('fobi_checklists')
                    ->where('id', $actualId)
                    ->update(['deleted_at' => now()]);

            } elseif ($source === 'kupunesia') {
                // Soft delete related records
                DB::table('fobi_checklist_faunasv2')
                    ->where('checklist_id', $actualId)
                    ->update(['deleted_at' => now()]);

                DB::table('fobi_checklist_fauna_imgs_kupnes')
                    ->where('checklist_id', $actualId)
                    ->update(['deleted_at' => now()]);

                // Soft delete checklist
                DB::table('fobi_checklists_kupnes')
                    ->where('id', $actualId)
                    ->update(['deleted_at' => now()]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Checklist berhasil dihapus'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in destroy: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menghapus checklist'
            ], 500);
        }
    }

    /**
     * Delete specific fauna from checklist
     */
    public function deleteFauna($checklistId, $faunaId)
    {
        try {
            $user = auth()->user();
            $source = request()->query('source', 'fobi');
            $actualId = $this->getActualId($checklistId, $source);

            if (!$this->canModifyChecklist($user, $actualId, $source)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $table = $source === 'kupunesia' ? 'fobi_checklist_faunasv2' : 'fobi_checklist_faunasv1';

            $deleted = DB::table($table)
                ->where([
                    'checklist_id' => $actualId,
                    'fauna_id' => $faunaId
                ])
                ->update(['deleted_at' => now()]);

            if ($deleted) {
                return response()->json([
                    'success' => true,
                    'message' => 'Spesies berhasil dihapus dari checklist'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Spesies tidak ditemukan dalam checklist'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Error in deleteFauna: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menghapus spesies'
            ], 500);
        }
    }

    /**
     * Check if user can modify checklist
     */
    private function canModifyChecklist($user, $checklistId, $source)
    {
        $table = $source === 'kupunesia' ? 'fobi_checklists_kupnes' : 'fobi_checklists';

        $checklist = DB::table($table)
            ->where('id', $checklistId)
            ->first();

        if (!$checklist) return false;

        return $user->id === $checklist->fobi_user_id ||
               in_array($user->level, [3, 4]);
    }

    private function getActualId($id, $source)
    {
        if ($source === 'burungnesia') {
            if (str_starts_with($id, 'BN')) {
                return substr($id, 2);
            } elseif (str_starts_with($id, 'BNAPP')) {
                return substr($id, 5);
            }
        } elseif ($source === 'kupunesia') {
            if (str_starts_with($id, 'KP')) {
                return substr($id, 2);
            } elseif (str_starts_with($id, 'KPAPP')) {
                return substr($id, 5);
            }
        }
        return $id;
    }
}
