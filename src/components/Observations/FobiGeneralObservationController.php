<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Traits\TaxaQualityAssessmentTrait;
use App\Models\TaxaQualityAssessment;
use App\Models\FobiChecklistTaxa;
use Intervention\Image\ImageManagerStatic as Image;
use Illuminate\Validation\Rule;

class FobiGeneralObservationController extends Controller
{
    use TaxaQualityAssessmentTrait;

    private function getLocationName($latitude, $longitude)
    {
        try {
            if (!$latitude || !$longitude) {
                return 'Unknown Location';
            }

        $url = "https://nominatim.openstreetmap.org/reverse?format=json&lat={$latitude}&lon={$longitude}&addressdetails=1";

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'FOBi Application');

            $response = curl_exec($ch);
            $data = json_decode($response, true);

        if (isset($data['address'])) {
            $address = $data['address'];
            $parts = [];

            // City/Town/Municipality
            if (isset($address['city']) || isset($address['town']) || isset($address['municipality'])) {
                $parts[] = $address['city'] ?? $address['town'] ?? $address['municipality'];
            }

            // County/Regency
            if (isset($address['county']) || isset($address['regency'])) {
                $parts[] = $address['county'] ?? $address['regency'];
            }

            // State (Province)
            if (isset($address['state'])) {
                $parts[] = $address['state'];
            }

            // Country
            if (isset($address['country'])) {
                $parts[] = $address['country'];
            }

            return !empty($parts) ? implode(', ', $parts) : 'Unknown Location';
        }

            return 'Unknown Location';

        } catch (\Exception $e) {
            Log::error('Error getting location name:', [
                'error' => $e->getMessage(),
                'latitude' => $latitude,
                'longitude' => $longitude
            ]);
            return 'Unknown Location';
        }
    }
    public function generateSpectrogram(Request $request)
    {
        try {
            $request->validate([
                'media' => 'required|file|mimes:mp3,wav,ogg|max:15120',
            ]);

            $uploadPath = storage_path('app/public/sounds');
            if (!file_exists($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }

            $soundFile = $request->file('media');
            $soundPath = $soundFile->store('sounds', 'public');
            $spectrogramPath = preg_replace('/\.(mp3|wav|ogg)$/i', '.png', $soundPath);

            // Set environment variables
            $env = [
                'PATH' => '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                'PYTHONPATH' => '/var/www/talinara/venv/lib/python3.12/site-packages'
            ];

            $command = escapeshellcmd("/var/www/talinara/venv/bin/python " . base_path('/scripts/spectrogram.py') . " " .
                storage_path('app/public/' . $soundPath) . " " .
                storage_path('app/public/' . $spectrogramPath));

            Log::info('Running spectrogram command:', [
                'command' => $command,
                'env' => $env
            ]);

            // Jalankan command dengan environment yang sudah diset
            $process = proc_open($command, [
                0 => ["pipe", "r"],
                1 => ["pipe", "w"],
                2 => ["pipe", "w"]
            ], $pipes, null, $env);

            if (is_resource($process)) {
                $stdout = stream_get_contents($pipes[1]);
                $stderr = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($process);

                Log::info('Command output:', [
                    'stdout' => $stdout,
                    'stderr' => $stderr
                ]);

                if (!Storage::disk('public')->exists($spectrogramPath)) {
                    throw new \Exception("Gagal membuat spectrogram: $stderr");
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Spectrogram berhasil dibuat',
                    'spectrogramUrl' => asset('storage/' . $spectrogramPath),
                    'audioUrl' => asset('storage/' . $soundPath)
                ]);
            }

            throw new \Exception('Gagal menjalankan proses spectrogram');

        } catch (\Exception $e) {
            Log::error('Error generating spectrogram: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat spectrogram',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function processAudioFile($file)
    {
        try {
            $uploadPath = storage_path('app/public/sounds');
            if (!file_exists($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }

            $path = $file->store('sounds', 'public');
            $spectrogramPath = preg_replace('/\.(mp3|wav|ogg)$/i', '.png', $path);

            // Set environment variables
            $env = [
                'PATH' => '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                'PYTHONPATH' => '/var/www/talinara/venv/lib/python3.12/site-packages'
            ];

            $command = escapeshellcmd("/var/www/talinara/venv/bin/python " . base_path('/scripts/spectrogram.py') . " " .
                storage_path('app/public/' . $path) . " " .
                storage_path('app/public/' . $spectrogramPath));

            Log::info('Running spectrogram command:', [
                'command' => $command,
                'env' => $env
            ]);

            // Jalankan command dengan environment yang sudah diset
            $process = proc_open($command, [
                0 => ["pipe", "r"],
                1 => ["pipe", "w"],
                2 => ["pipe", "w"]
            ], $pipes, null, $env);

            if (is_resource($process)) {
                $stdout = stream_get_contents($pipes[1]);
                $stderr = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($process);

                Log::info('Command output:', [
                    'stdout' => $stdout,
                    'stderr' => $stderr
                ]);

                if (!Storage::disk('public')->exists($spectrogramPath)) {
                    throw new \Exception("Gagal membuat spectrogram: $stderr");
                }

                return [
                    'audioPath' => $path,
                    'spectrogramPath' => $spectrogramPath,
                    'success' => true
                ];
            }

            throw new \Exception('Gagal menjalankan proses spectrogram');

        } catch (\Exception $e) {
            Log::error('Error processing audio file: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    private function processImageFile($file)
    {
        try {
            $uploadPath = storage_path('app/public/observations');
            if (!file_exists($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }

            // Buat instance image
            $image = Image::make($file->getRealPath());

            // Dapatkan orientasi asli
            $width = $image->width();
            $height = $image->height();
            $isPortrait = $height > $width;

            // Set max dimension berdasarkan orientasi
            $maxDimension = 1200;

            if ($isPortrait) {
                // Jika portrait, set height maksimal
                if ($height > $maxDimension) {
                    $image->resize(null, $maxDimension, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                }
            } else {
                // Jika landscape, set width maksimal
                if ($width > $maxDimension) {
                    $image->resize($maxDimension, null, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                }
            }

            // Pertahankan orientasi EXIF
            $image->orientate();

            // Generate nama file unik
            $fileName = uniqid('img_') . '.jpg';
            $relativePath = 'observations/' . $fileName;
            $fullPath = storage_path('app/public/' . $relativePath);

            // Simpan dengan quality 80%
            $image->save($fullPath, 80);

            // Log informasi gambar
            Log::info('Image processed:', [
                'original_dimensions' => "$width x $height",
                'new_dimensions' => $image->width() . ' x ' . $image->height(),
                'orientation' => $isPortrait ? 'portrait' : 'landscape',
                'path' => $relativePath
            ]);

            return [
                'imagePath' => $relativePath,
                'success' => true,
                'dimensions' => [
                    'width' => $image->width(),
                    'height' => $image->height()
                ],
                'orientation' => $isPortrait ? 'portrait' : 'landscape'
            ];

        } catch (\Exception $e) {
            Log::error('Error processing image file: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function store(Request $request)
    {
        try {
            DB::beginTransaction();

            if (!$request->scientific_name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nama spesies harus diisi'
                ], 422);
            }

            $location = $this->getLocationName(
                $request->input('latitude'),
                $request->input('longitude')
            );

            // Proses taxa dan identifikasi awal
            $taxaResult = $this->processTaxa($request);
            $checklistId = $taxaResult['checklist_id'];
            $mainTaxaId = $taxaResult['taxa_id'];
            $identificationId = $taxaResult['identification_id'];
            $newSessionId = $taxaResult['new_session_id'];

            // Proses media yang diunggah
            if ($request->hasFile('media')) {
                $mediaFiles = is_array($request->file('media')) ? $request->file('media') : [$request->file('media')];
                $isCombined = $request->input('is_combined', false);
                $totalFiles = count($mediaFiles);

                // Validasi kombinasi media
                if ($isCombined && $totalFiles > 1) {
                    $mediaTypes = [];
                    foreach ($mediaFiles as $file) {
                        $mediaTypes[] = strpos($file->getMimeType(), 'image') !== false ? 'photo' : 'audio';
                    }

                    // Validasi kombinasi yang diizinkan
                    $isValidCombination =
                        // Semua foto
                        (count(array_filter($mediaTypes, fn($type) => $type === 'photo')) === count($mediaTypes)) ||
                        // Semua audio
                        (count(array_filter($mediaTypes, fn($type) => $type === 'audio')) === count($mediaTypes)) ||
                        // Kombinasi foto dan audio
                        (in_array('photo', $mediaTypes) && in_array('audio', $mediaTypes));

                    if (!$isValidCombination) {
                        throw new \Exception('Kombinasi media tidak valid. Hanya mendukung: semua foto, semua audio, atau kombinasi foto dan audio');
                    }
                }

                // Proses setiap file media
                foreach ($mediaFiles as $index => $mediaFile) {
                    try {
                        $mediaType = strpos($mediaFile->getMimeType(), 'image') !== false ? 'photo' : 'audio';
                        $path = null;
                        $spectrogramPath = null;

                        if ($mediaType === 'photo') {
                            $result = $this->processImageFile($mediaFile);
                            if ($result['success']) {
                                $path = $result['imagePath'];
                            } else {
                                throw new \Exception($result['error']);
                            }
                        } else {
                            $result = $this->processAudioFile($mediaFile);
                            if ($result['success']) {
                                $path = $result['audioPath'];
                                $spectrogramPath = $result['spectrogramPath'];
                            } else {
                                throw new \Exception($result['error']);
                            }
                        }

                        // Log untuk debugging
                        Log::info('Saving media to database:', [
                            'mediaType' => $mediaType,
                            'path' => $path,
                            'spectrogramPath' => $spectrogramPath
                        ]);

                        // Simpan media dengan validasi
                        if (!$path) {
                            throw new \Exception('Path file tidak valid');
                        }

                        DB::table('fobi_checklist_media')->insert([
                            'checklist_id' => $checklistId,
                            'media_type' => $mediaType,
                            'file_path' => $path,
                            'spectrogram' => $spectrogramPath,
                            'scientific_name' => $request->input('scientific_name'),
                            'location' => $location,
                            'habitat' => $request->habitat ?? 'Unknown Habitat',
                            'description' => $request->description ?? '',
                            'date' => $request->date ?? now(),
                            'status' => 0, // Tambahkan status
                            'is_combined' => $isCombined && $totalFiles > 1,
                            'combined_order' => ($isCombined && $totalFiles > 1) ? $index : null,
                            'combined_type' => ($isCombined && $totalFiles > 1) ? $this->determineCombinedType($mediaTypes) : null,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);

                    } catch (\Exception $e) {
                        Log::error('Error processing media:', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                        throw $e;
                    }
                }
            }

            // Update atau buat quality assessment
            $taxaData = (object)[
                'id' => $checklistId,
                'created_at' => $request->tgl_pengamatan ?? now(),
                'location' => $location,
                'media' => $request->hasFile('media'),
                'scientific_name' => $request->scientific_name
            ];

            $qualityAssessment = $this->assessTaxaQuality($taxaData);

            // Update jika sudah ada, buat baru jika belum
            TaxaQualityAssessment::updateOrCreate(
                ['taxa_id' => $checklistId],
                [
                    'taxon_id' => $mainTaxaId, // Gunakan ID dari tabel taxas
                    'grade' => $qualityAssessment['grade'],
                    'has_date' => $qualityAssessment['has_date'],
                    'has_location' => $qualityAssessment['has_location'],
                    'has_media' => $qualityAssessment['has_media'],
                    'is_wild' => $qualityAssessment['is_wild'],
                    'location_accurate' => $qualityAssessment['location_accurate'],
                    'recent_evidence' => $qualityAssessment['recent_evidence'],
                    'related_evidence' => $qualityAssessment['related_evidence'],
                    'needs_id' => $qualityAssessment['needs_id'],
                    'community_id_level' => $qualityAssessment['community_id_level']
                ]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Data berhasil disimpan',
                'checklist_id' => $checklistId,
                'identification_id' => $identificationId,
                'new_session_id' => $newSessionId,
                'quality_assessment' => $qualityAssessment,
                'total_media' => $request->hasFile('media') ? count($mediaFiles) : 0,
                'is_combined' => $isCombined ?? false
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyimpan data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Tambahkan method helper baru
    private function determineCombinedType($mediaTypes)
    {
        $hasPhoto = in_array('photo', $mediaTypes);
        $hasAudio = in_array('audio', $mediaTypes);

        if ($hasPhoto && $hasAudio) {
            return 'mixed';
        } elseif ($hasPhoto) {
            return 'photos';
        } elseif ($hasAudio) {
            return 'audios';
        }

        return null;
    }

    private function processTaxa($request)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            // Dapatkan taxa_id dari tabel taxas
            $mainTaxaId = $this->getOrCreateMainTaxa($request);

            DB::beginTransaction();

            // Buat checklist baru
            $checklistId = DB::table('fobi_checklist_taxas')->insertGetId([
                'taxa_id' => $mainTaxaId,
                'user_id' => $user->id,
                'media_id' => null,
                'scientific_name' => $request->scientific_name,
                'class' => $request->input('class'),          // Gunakan input() untuk memastikan
                'order' => $request->input('order'),          // nilai null ditangani dengan benar
                'family' => $request->input('family'),
                'genus' => $request->input('genus'),
                'species' => $request->input('species'),
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'observation_details' => $request->additional_note,
                'upload_session_id' => $request->upload_session_id,
                'date' => $request->date,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Simpan identifikasi awal ke taxa_identifications
            $identificationId = DB::table('taxa_identifications')->insertGetId([
                'checklist_id' => $checklistId,
                'user_id' => $user->id,
                'taxon_id' => $mainTaxaId,
                'identification_level' => $this->determineIdentificationLevel($request),
                'comment' => $request->additional_note,
                'user_agreed' => false,
                'agreement_count' => 0,
                'is_main' => true,
                'is_first' => true,
                'created_at' => now(),
                'updated_at' => now(),
                'burnes_checklist_id' => null,
                'kupnes_checklist_id' => null
            ]);

            DB::commit();

            Log::info('Membuat checklist dan identifikasi awal:', [
                'checklist_id' => $checklistId,
                'identification_id' => $identificationId,
                'upload_session_id' => $request->upload_session_id,
                'taxa_id' => $mainTaxaId
            ]);

            $newSessionId = $this->generateNewSessionId($user->id);

            return [
                'checklist_id' => $checklistId,
                'taxa_id' => $mainTaxaId,
                'identification_id' => $identificationId,
                'new_session_id' => $newSessionId
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing taxa:', [
                'error' => $e->getMessage(),
                'upload_session_id' => $request->upload_session_id ?? null,
                'taxa_id' => $mainTaxaId ?? null
            ]);
            throw $e;
        }
    }

    private function determineIdentificationLevel($request)
    {
        if ($request->species) {
            return 'species';
        } elseif ($request->genus) {
            return 'genus';
        } elseif ($request->family) {
            return 'family';
        } elseif ($request->order) {
            return 'order';
        } elseif ($request->class) {
            return 'class';
        } else {
            return 'unknown';
        }
    }

    // Method baru untuk generate session ID
    private function generateNewSessionId($userId)
    {
        return "obs_{$userId}_" . time() . "_" . uniqid();
    }

    public function generateUploadSession()
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
            $sessionId = $this->generateNewSessionId($user->id);

            return response()->json([
                'success' => true,
                'upload_session_id' => $sessionId
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat session ID'
            ], 500);
        }
    }

    // Fungsi helper untuk mendapatkan atau membuat taxa di tabel utama
    private function getOrCreateMainTaxa($request)
    {
        try {
            $scientificName = trim($request->scientific_name);
            $nameParts = explode(' ', $scientificName);
            
            // Deteksi rank dari nama jika tidak ada di request
            $taxonRank = strtoupper($request->taxon_rank ?? $this->detectRankFromName($scientificName));
            
            // Buat scientific_name yang sesuai format
            $formattedScientificName = $this->formatScientificName($scientificName, $taxonRank);
            
            // Query dasar
            $query = DB::table('taxas');
            
            // Penanganan khusus berdasarkan rank
            switch ($taxonRank) {
                case 'SPECIES':
                    if (count($nameParts) < 2) {
                        throw new \Exception("Nama species harus terdiri dari genus dan species");
                    }
                    $genus = $nameParts[0];
                    $species = $nameParts[1];
                    $query->where('genus', $genus)
                          ->where('species', 'LIKE', "$species%")
                          ->where('taxon_rank', 'SPECIES');
                    break;
                    
                case 'SUBSPECIES':
                    if (count($nameParts) < 3) {
                        throw new \Exception("Nama subspecies harus terdiri dari genus, species, dan subspecies");
                    }
                    $genus = $nameParts[0];
                    $species = $nameParts[1];
                    $subspecies = '';
                    
                    // Cari bagian subspecies
                    for ($i = 2; $i < count($nameParts); $i++) {
                        if (!in_array(strtolower($nameParts[$i]), ['subsp.', 'ssp.', 'subspecies'])) {
                            $subspecies = $nameParts[$i];
                            break;
                        }
                    }
                    
                    $query->where(function($q) use ($genus, $species, $subspecies, $formattedScientificName) {
                        $q->where(function($subQ) use ($genus, $species, $subspecies) {
                            $subQ->where('genus', $genus)
                                 ->where('species', 'LIKE', "$species%")
                                 ->where('subspecies', 'LIKE', "%$subspecies%");
                        })->orWhere('scientific_name', 'LIKE', "$genus $species $subspecies%")
                          ->orWhere('scientific_name', 'LIKE', "$genus $species subsp. $subspecies%");
                    })->where('taxon_rank', 'SUBSPECIES');
                    break;
                    
                case 'VARIETY':
                    if (count($nameParts) < 4) {
                        throw new \Exception("Nama variety harus terdiri dari genus, species, dan variety");
                    }
                    $genus = $nameParts[0];
                    $species = $nameParts[1];
                    $variety = '';
                    
                    // Cari bagian variety
                    for ($i = 2; $i < count($nameParts); $i++) {
                        if (!in_array(strtolower($nameParts[$i]), ['var.', 'variety'])) {
                            $variety = $nameParts[$i];
                            break;
                        }
                    }
                    
                    $query->where(function($q) use ($genus, $species, $variety) {
                        $q->where(function($subQ) use ($genus, $species, $variety) {
                            $subQ->where('genus', $genus)
                                 ->where('species', 'LIKE', "$species%")
                                 ->where('variety', 'LIKE', "%$variety%");
                        })->orWhere('scientific_name', 'LIKE', "$genus $species var. $variety%");
                    })->where('taxon_rank', 'VARIETY');
                    break;
                    
                case 'FORM':
                    if (count($nameParts) < 4) {
                        throw new \Exception("Nama form harus terdiri dari genus, species, dan form");
                    }
                    $genus = $nameParts[0];
                    $species = $nameParts[1];
                    $form = '';
                    
                    // Cari bagian form
                    for ($i = 2; $i < count($nameParts); $i++) {
                        if (!in_array(strtolower($nameParts[$i]), ['f.', 'form', 'forma'])) {
                            $form = $nameParts[$i];
                            break;
                        }
                    }
                    
                    $query->where('genus', $genus)
                          ->where('species', 'LIKE', "$species%")
                          ->where('form', 'LIKE', "%$form%")
                          ->where('taxon_rank', 'FORM');
                    break;
                    
                case 'GENUS':
                    $query->where('genus', $nameParts[0])
                          ->where('taxon_rank', 'GENUS');
                    break;
                    
                case 'FAMILY':
                    $query->where('family', 'LIKE', "%$scientificName%")
                          ->where('taxon_rank', 'FAMILY');
                    break;
                    
                case 'ORDER':
                    $query->where('order', 'LIKE', "%$scientificName%")
                          ->where('taxon_rank', 'ORDER');
                    break;
                    
                case 'CLASS':
                    $query->where('class', 'LIKE', "%$scientificName%")
                          ->where('taxon_rank', 'CLASS');
                    break;
                    
                case 'PHYLUM':
                    $query->where('phylum', 'LIKE', "%$scientificName%")
                          ->where('taxon_rank', 'PHYLUM');
                    break;
                    
                case 'KINGDOM':
                    $query->where('kingdom', 'LIKE', "%$scientificName%")
                          ->where('taxon_rank', 'KINGDOM');
                    break;
                    
                default:
                    // Untuk rank lainnya, cari di scientific_name dan kolom spesifik
                    $query->where(function($q) use ($scientificName, $taxonRank) {
                        $q->where('scientific_name', 'LIKE', "%$scientificName%")
                          ->orWhere(DB::raw('LOWER(taxon_rank)'), '=', strtolower($taxonRank));
                    })->where('taxon_rank', $taxonRank);
                    break;
            }
            
            // Debug query
            Log::info('Taxa search query:', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings(),
                'scientific_name' => $scientificName,
                'formatted_name' => $formattedScientificName,
                'taxon_rank' => $taxonRank,
                'name_parts' => $nameParts
            ]);
            
            $match = $query->first();
            
            if (!$match) {
                // Coba cari dengan searchTaxa
                $searchRequest = new Request([
                    'q' => $scientificName,
                    'rank' => $taxonRank,
                    'source' => $request->source ?? 'fobi'
                ]);
                
                $qualityAssessmentController = app(ChecklistQualityAssessmentController::class);
                $searchController = new ChecklistObservationController($qualityAssessmentController);
                $searchResult = $searchController->searchTaxa($searchRequest);
                
                $searchData = json_decode($searchResult->getContent());
                if ($searchData->success && !empty($searchData->data)) {
                    foreach ($searchData->data as $taxa) {
                        if (strtoupper($taxa->rank) === $taxonRank) {
                            return $taxa->id;
                        }
                    }
                }
                
                throw new \Exception("Taxa dengan nama '$scientificName' dan rank '$taxonRank' tidak ditemukan dalam database");
            }
            
            return $match->id;
            
        } catch (\Exception $e) {
            Log::error('Error in getOrCreateMainTaxa:', [
                'error' => $e->getMessage(),
                'scientific_name' => $scientificName ?? null,
                'taxon_rank' => $taxonRank ?? null,
                'name_parts' => $nameParts ?? []
            ]);
            throw $e;
        }
    }

    private function formatScientificName($name, $rank)
    {
        $parts = explode(' ', $name);
        
        switch ($rank) {
            case 'SUBSPECIES':
                // Format: Genus species subspecies (tanpa subsp.)
                if (count($parts) >= 3) {
                    $genus = $parts[0];
                    $species = $parts[1];
                    $subspecies = '';
                    
                    // Cari subspecies name (skip 'subsp.' atau 'subspecies')
                    for ($i = 2; $i < count($parts); $i++) {
                        if (!in_array(strtolower($parts[$i]), ['subsp.', 'ssp.', 'subspecies'])) {
                            $subspecies = $parts[$i];
                            break;
                        }
                    }
                    
                    return "$genus $species $subspecies";
                }
                break;
                
            case 'VARIETY':
                // Format: Genus species var. variety
                if (count($parts) >= 4) {
                    $genus = $parts[0];
                    $species = $parts[1];
                    $variety = '';
                    
                    // Cari variety name (skip 'var.' atau 'variety')
                    for ($i = 2; $i < count($parts); $i++) {
                        if (!in_array(strtolower($parts[$i]), ['var.', 'variety'])) {
                            $variety = $parts[$i];
                            break;
                        }
                    }
                    
                    return "$genus $species var. $variety";
                }
                break;
                
            case 'FORM':
                // Format: Genus species f. form
                if (count($parts) >= 4) {
                    $genus = $parts[0];
                    $species = $parts[1];
                    $form = end($parts);
                    return "$genus $species f. $form";
                }
                break;
        }
        
        return $name; // Return original if no special formatting needed
    }

    private function detectRankFromName($scientificName)
    {
        $nameParts = explode(' ', $scientificName);
        
        // Deteksi berdasarkan penanda rank
        foreach ($nameParts as $part) {
            $lower = strtolower($part);
            if (in_array($lower, ['subsp.', 'ssp.', 'subspecies'])) {
                return 'SUBSPECIES';
            }
            if (in_array($lower, ['var.', 'variety'])) {
                return 'VARIETY';
            }
            if (in_array($lower, ['f.', 'form', 'forma'])) {
                return 'FORM';
            }
        }
        
        // Deteksi berdasarkan pola nama
        if (count($nameParts) === 1) {
            // Cek apakah ini mungkin CLASS
            if (in_array($scientificName, ['Aves', 'Mammalia', 'Reptilia', 'Amphibia'])) {
                return 'CLASS';
            }
            // Cek apakah ini mungkin ORDER
            if (in_array($scientificName, ['Passeriformes', 'Carnivora', 'Primates'])) {
                return 'ORDER';
            }
            // Cek apakah ini mungkin FAMILY
            if (substr($scientificName, -4) === 'idae') {
                return 'FAMILY';
            }
            return 'GENUS'; // Default untuk satu kata
        }
        
        if (count($nameParts) === 2) {
            return 'SPECIES';
        }
        
        return 'SPECIES'; // Default
    }

    private function extractBaseScientificName($scientificName)
    {
        // Hapus author dan tahun dalam kurung
        $name = preg_replace('/\([^)]+\)/', '', $scientificName);
        
        // Hapus author dan tahun tanpa kurung (pola: Nama Author, YYYY)
        $name = preg_replace('/\s+[A-Z][a-zé\s]+,?\s+\d{4}/', '', $name);
        
        // Hapus 'subsp.' jika ada
        $name = str_replace(' subsp.', '', $name);
        
        // Bersihkan spasi berlebih
        return trim(preg_replace('/\s+/', ' ', $name));
    }

    private function getTaxonomyInfo($scientificName)
    {
        try {
            // Menggunakan GBIF API untuk mendapatkan informasi taksonomi
            $response = Http::get('https://api.gbif.org/v1/species/match', [
                'name' => $scientificName,
                'strict' => false
            ]);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'data' => [
                        'scientific_name' => $data['scientificName'] ?? $scientificName,
                        'taxon_rank' => strtolower($data['rank'] ?? ''),
                        'kingdom' => $data['kingdom'] ?? '',
                        'phylum' => $data['phylum'] ?? '',
                        'class' => $data['class'] ?? '',
                        'order' => $data['order'] ?? '',
                        'family' => $data['family'] ?? '',
                        'genus' => $data['genus'] ?? '',
                        'species' => $data['species'] ?? ''
                    ]
                ];
            }

            return [
                'success' => false,
                'message' => 'Tidak dapat menemukan informasi taksonomi'
            ];

        } catch (\Exception $e) {
            Log::error('Error getting taxonomy info: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil informasi taksonomi'
            ];
        }
    }

    // Tambahkan endpoint baru untuk mendapatkan informasi taksonomi
    public function getTaxonomy(Request $request)
    {
        $request->validate([
            'scientific_name' => 'required|string'
        ]);

        $result = $this->getTaxonomyInfo($request->scientific_name);

        if ($result['success']) {
            return response()->json([
                'success' => true,
                'data' => $result['data']
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => $result['message']
        ], 404);
    }

    public function getChecklistDetail($id)
    {
        try {
            $userId = JWTAuth::user()->id;

            $checklist = DB::table('fobi_checklist_taxas')
                ->join('taxa_quality_assessments', 'fobi_checklist_taxas.id', '=', 'taxa_quality_assessments.taxa_id')
                ->join('fobi_users', 'fobi_checklist_taxas.user_id', '=', 'fobi_users.id')
                ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
                ->where('fobi_checklist_taxas.id', $id)
                ->select(
                    'fobi_checklist_taxas.*',
                    'taxa_quality_assessments.grade',
                    'fobi_users.uname as observer_name',
                    'taxas.iucn_red_list_category',
                    'fobi_checklist_taxas.agreement_count'
                )
                ->first();

            if (!$checklist) {
                return response()->json([
                    'success' => false,
                    'message' => 'Checklist tidak ditemukan'
                ], 404);
            }

            // Ambil semua media terkait
            $medias = DB::table('fobi_checklist_media')
                ->where('checklist_id', $id)
                ->select(
                    'id',
                    DB::raw("CASE
                        WHEN media_type = 'photo' THEN 'image'
                        WHEN media_type = 'audio' THEN 'audio'
                        ELSE media_type
                    END as type"),
                    DB::raw("CONCAT('" . asset('storage/') . "/', file_path) as url"),
                    DB::raw("CASE
                        WHEN media_type = 'audio'
                        THEN CONCAT('" . asset('storage/') . "/', REPLACE(file_path, SUBSTRING_INDEX(file_path, '.', -1), 'png'))
                        ELSE NULL
                    END as spectrogramUrl")
                )
                ->get();

            // Ambil identifikasi dengan informasi tambahan
            $identifications = DB::table('taxa_identifications as ti')
                ->join('fobi_users as u', 'ti.user_id', '=', 'u.id')
                ->join('taxas as t', 'ti.taxon_id', '=', 't.id')
                ->where('ti.checklist_id', $id)
                ->select(
                    'ti.*',
                    'u.uname',
                    't.scientific_name',
                    't.taxon_rank as identification_level',
                    'u.uname as identifier_name',
                    'u.created_at as identifier_joined_date',
                    DB::raw('(SELECT COUNT(*) FROM taxa_identifications WHERE user_id = u.id) as identifier_identification_count'),
                    DB::raw('(SELECT COUNT(*) FROM taxa_identifications AS ti2
                        WHERE ti2.agrees_with_id = ti.id
                        AND ti2.is_agreed = true) as agreement_count'),
                    DB::raw('(SELECT COUNT(*) > 0 FROM taxa_identifications AS ti2
                        WHERE ti2.agrees_with_id = ti.id
                        AND ti2.user_id = ' . $userId . '
                        AND ti2.is_agreed = true) as user_agreed'),
                    DB::raw('(SELECT COUNT(*) > 0 FROM taxa_identifications AS ti2
                        WHERE ti2.agrees_with_id = ti.id
                        AND ti2.user_id = ' . $userId . '
                        AND ti2.is_agreed = false) as user_disagreed'),
                    DB::raw("CASE WHEN ti.photo_path IS NOT NULL
                        THEN CONCAT('" . asset('storage') . "/', ti.photo_path)
                        ELSE NULL END as photo_url")
                )
                ->orderBy('ti.is_first', 'desc')
                ->orderBy('ti.created_at', 'desc')
                ->get();

            // Ambil agreements untuk checklist
            $agreements = DB::table('taxa_identifications as ti')
                ->join('fobi_users as u', 'ti.user_id', '=', 'u.id')
                ->where('ti.checklist_id', $id)
                ->where('ti.is_agreed', true)
                ->select(
                    'u.uname as user_name',
                    'ti.created_at as agreed_at',
                    'u.created_at as user_joined_date',
                    DB::raw('(SELECT COUNT(*) FROM taxa_identifications WHERE user_id = u.id) as total_identifications')
                )
                ->get();

            // Ambil verifikasi lokasi dan status liar
            $locationVerifications = DB::table('taxa_location_verifications')
                ->where('checklist_id', $id)
                ->get();

            $wildStatusVotes = DB::table('taxa_wild_status_votes')
                ->where('checklist_id', $id)
                ->get();

            // Tambahkan medias dan agreements ke dalam checklist
            $checklist->medias = $medias;
            $checklist->agreements = $agreements;

            return response()->json([
                'success' => true,
                'data' => [
                    'checklist' => $checklist,
                    'identifications' => $identifications,
                    'location_verifications' => $locationVerifications,
                    'wild_status_votes' => $wildStatusVotes,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching checklist detail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan'
            ], 500);
        }
    }
    public function addIdentification(Request $request, $id)
    {
        try {
            $request->validate([
                'taxon_id' => 'required|exists:taxas,id',
                'comment' => 'nullable|string|max:500',
                'photo' => 'nullable|image|max:5120', // Max 5MB
                'identification_level' => 'required|string'
            ]);

            DB::beginTransaction();

            $user = JWTAuth::user();
            $photoPath = null;

            // Proses upload foto jika ada
            if ($request->hasFile('photo')) {
                $photo = $request->file('photo');
                $photoPath = $photo->store('identification-photos', 'public');
            }

            // Simpan identifikasi
            $identificationId = DB::table('taxa_identifications')->insertGetId([
                'checklist_id' => $id,
                'user_id' => $user->id,
                'taxon_id' => $request->taxon_id,
                'identification_level' => $request->identification_level,
                'comment' => $request->comment,
                'photo_path' => $photoPath,
                'is_first' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Update quality assessment
            $this->updateQualityAssessment($id);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Identifikasi berhasil ditambahkan',
                'data' => [
                    'id' => $identificationId,
                    'photo_url' => $photoPath ? asset('storage/' . $photoPath) : null
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error adding identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menambahkan identifikasi'
            ], 500);
        }
    }

    // Tambahkan method untuk mengambil identifikasi dengan foto
    private function getIdentificationsWithPhotos($checklistId)
    {
        return DB::table('taxa_identifications as ti')
            ->join('fobi_users as u', 'ti.user_id', '=', 'u.id')
            ->join('taxas as t', 'ti.taxon_id', '=', 't.id')
            ->where('ti.checklist_id', $checklistId)
            ->select(
                'ti.*',
                'u.uname as identifier_name',
                't.scientific_name',
                DB::raw("CASE WHEN ti.photo_path IS NOT NULL
                    THEN CONCAT('" . asset('storage') . "/', ti.photo_path)
                    ELSE NULL END as photo_url")
            )
            ->orderBy('ti.created_at', 'desc')
            ->get();
    }
    public function withdrawIdentification($checklistId, $identificationId)
    {
        try {
            DB::beginTransaction();

            // Tarik identifikasi
            DB::table('taxa_identifications')
                ->where('id', $identificationId)
                ->update(['is_withdrawn' => true]);

            // Hapus semua persetujuan terkait
            DB::table('taxa_identifications')
                ->where('agrees_with_id', $identificationId)
                ->delete();

            // Reset community_id_level dan grade ke default
            DB::table('taxa_quality_assessments')
                ->where('taxa_id', $checklistId)
                ->update([
                    'community_id_level' => null,
                    'grade' => 'needs ID'
                ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Identifikasi berhasil ditarik dan pengaturan direset'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in withdrawIdentification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menarik identifikasi'
            ], 500);
        }
    }
        private function updateChecklistTaxon($checklistId)
    {
        try {
            // Ambil identifikasi dengan persetujuan terbanyak
            $mostAgreedIdentification = DB::table('taxa_identifications as ti')
                ->select(
                    'ti.taxon_id',
                    't.scientific_name',
                    't.iucn_red_list_category',
                    't.class',
                    't.order',
                    't.family',
                    't.genus',
                    't.species',
                    DB::raw('COUNT(ti2.id) as agreement_count')
                )
                ->join('taxas as t', 'ti.taxon_id', '=', 't.id')
                ->leftJoin('taxa_identifications as ti2', function($join) {
                    $join->on('ti.id', '=', 'ti2.agrees_with_id')
                        ->where('ti2.is_agreed', '=', true);
                })
                ->where('ti.checklist_id', $checklistId)
                ->where('ti.is_first', true) // Hanya cek persetujuan untuk identifikasi pertama
                ->groupBy('ti.taxon_id', 't.scientific_name', 't.iucn_red_list_category',
                         't.class', 't.order', 't.family', 't.genus', 't.species')
                ->first();

                if ($mostAgreedIdentification) {
                    // Update checklist dengan taxa yang disetujui
                    $updateData = [
                        'taxa_id' => $mostAgreedIdentification->taxon_id,
                        'scientific_name' => $mostAgreedIdentification->scientific_name,
                        'class' => $mostAgreedIdentification->class,
                        'order' => $mostAgreedIdentification->order,
                        'family' => $mostAgreedIdentification->family,
                        'genus' => $mostAgreedIdentification->genus,
                        'species' => $mostAgreedIdentification->species,
                        'agreement_count' => $mostAgreedIdentification->agreement_count
                    ];

                    // Cek apakah memenuhi kriteria research grade
                    $assessment = TaxaQualityAssessment::where('taxa_id', $checklistId)->first();

                    if ($assessment && $assessment->grade === 'research grade') {
                        $updateData['iucn_status'] = $mostAgreedIdentification->iucn_red_list_category;
                    } else {
                        $updateData['iucn_status'] = null; // Reset jika bukan research grade
                    }

                    DB::table('fobi_checklist_taxas')
                        ->where('id', $checklistId)
                        ->update($updateData);
                // Log perubahan
                Log::info('Checklist updated:', [
                    'checklist_id' => $checklistId,
                    'new_taxa_id' => $mostAgreedIdentification->taxon_id,
                    'agreement_count' => $mostAgreedIdentification->agreement_count,
                    'is_research_grade' => $assessment ? $assessment->grade === 'research grade' : false
                ]);
            }

            return true;
        } catch (\Exception $e) {
            Log::error('Error updating checklist taxon: ' . $e->getMessage());
            throw $e;
        }
    }

    private function updateCommunityConsensus($checklistId)
    {
        $mostAgreedIdentification = DB::table('taxa_identifications')
            ->select('taxon_id', DB::raw('COUNT(*) as agreement_count'))
            ->where('checklist_id', $checklistId)
            ->where('is_agreed', true)
            ->groupBy('taxon_id')
            ->orderBy('agreement_count', 'desc')
            ->first();

        $updateData = [
            'updated_at' => now()
        ];

        if ($mostAgreedIdentification && $mostAgreedIdentification->agreement_count >= 2) {
            $updateData['taxa_id'] = $mostAgreedIdentification->taxon_id;
            $updateData['agreement_count'] = $mostAgreedIdentification->agreement_count;
        } else {
            // Reset jika tidak ada yang memenuhi syarat
            $updateData['agreement_count'] = 0;
        }

        DB::table('fobi_checklist_taxas')
            ->where('id', $checklistId)
            ->update($updateData);
    }

    private function evaluateAndUpdateGrade($assessment, $agreementCount)
    {
        try {
            // Ambil data checklist
            $checklist = FobiChecklistTaxa::findOrFail($assessment->taxa_id);
            $oldGrade = $assessment->grade;

            // Evaluasi grade berdasarkan kriteria
            if ($this->meetsResearchGradeCriteria($assessment, $agreementCount)) {
                $assessment->grade = 'research grade';

                // Jika baru mencapai research grade, update IUCN status
                if ($oldGrade !== 'research grade') {
                    // Ambil IUCN status dari taxa yang disetujui
                    $approvedTaxa = DB::table('taxa_identifications as ti')
                        ->join('taxas as t', 'ti.taxon_id', '=', 't.id')
                        ->where('ti.checklist_id', $assessment->taxa_id)
                        ->where('ti.is_agreed', true)
                        ->select('t.iucn_red_list_category')
                        ->first();

                    if ($approvedTaxa && $approvedTaxa->iucn_red_list_category) {
                        // Update IUCN status di checklist
                        DB::table('fobi_checklist_taxas')
                            ->where('id', $assessment->taxa_id)
                            ->update([
                                'iucn_status' => $approvedTaxa->iucn_red_list_category
                            ]);
                    }
                }
            }
            else if ($this->meetsNeedsIdCriteria($assessment)) {
                $assessment->grade = 'needs ID';
            }
            else {
                $assessment->grade = 'casual';
            }

            $assessment->save();

            Log::info('Grade evaluation result:', [
                'taxa_id' => $assessment->taxa_id,
                'old_grade' => $oldGrade,
                'new_grade' => $assessment->grade,
                'agreement_count' => $agreementCount,
                'iucn_status_updated' => $oldGrade !== 'research grade' && $assessment->grade === 'research grade'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in evaluateAndUpdateGrade:', [
                'error' => $e->getMessage(),
                'taxa_id' => $assessment->taxa_id ?? null
            ]);
            throw $e;
        }
    }
    // Tambahkan endpoint baru untuk menangani persetujuan identifikasi
    public function agreeWithIdentification($checklistId, $identificationId)
    {
        try {
            DB::beginTransaction();

            $user = JWTAuth::user();

            // Cek apakah sudah pernah setuju
            $existingAgreement = DB::table('taxa_identifications')
                ->where('checklist_id', $checklistId)
                ->where('user_id', $user->id)
                ->where('agrees_with_id', $identificationId)
                ->first();

            if ($existingAgreement) {
                throw new \Exception('Anda sudah menyetujui identifikasi ini');
            }

            // Ambil identifikasi yang disetujui
            $agreedIdentification = DB::table('taxa_identifications as ti')
                ->join('taxas as t', 't.id', '=', 'ti.taxon_id')
                ->join('fobi_users as u', 'u.id', '=', 'ti.user_id')
                ->where('ti.id', $identificationId)
                ->select(
                    'ti.*',
                    't.scientific_name',
                    't.iucn_red_list_category',
                    'u.uname as identifier_name'
                )
                ->first();

            // Simpan persetujuan
            $agreement = DB::table('taxa_identifications')->insert([
                'checklist_id' => $checklistId,
                'user_id' => $user->id,
                'agrees_with_id' => $identificationId,
                'taxon_id' => $agreedIdentification->taxon_id,
                'identification_level' => $agreedIdentification->identification_level,
                'is_agreed' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Hitung jumlah persetujuan untuk identifikasi ini
            $agreementCount = DB::table('taxa_identifications')
                ->where('agrees_with_id', $identificationId)
                ->where('is_agreed', true)
                ->count();

            // Jika persetujuan mencapai 2 atau lebih, update checklist dan assessment
            if ($agreementCount >= 2) {
                // Ambil data checklist sebelumnya
                $currentChecklist = DB::table('fobi_checklist_taxas')
                    ->where('id', $checklistId)
                    ->first();

                // Simpan perubahan ke history
                DB::table('taxa_identification_histories')->insert([
                    'checklist_id' => $checklistId,
                    'taxa_id' => $agreedIdentification->taxon_id,
                    'user_id' => $user->id,
                    'action_type' => 'change',
                    'scientific_name' => $agreedIdentification->scientific_name,
                    'previous_name' => $currentChecklist->scientific_name,
                    'reason' => 'Persetujuan komunitas',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update checklist
                DB::table('fobi_checklist_taxas')
                    ->where('id', $checklistId)
                    ->update([
                        'taxa_id' => $agreedIdentification->taxon_id,
                        'scientific_name' => $agreedIdentification->scientific_name,
                        'agreement_count' => $agreementCount,
                        'updated_at' => now()
                    ]);

                // Update quality assessment dengan community_id_level
                $assessment = TaxaQualityAssessment::firstOrCreate(
                    ['taxa_id' => $checklistId],
                    ['grade' => 'needs ID']
                );

                $assessment->community_id_level = $agreedIdentification->identification_level;

                // Evaluasi dan update grade
                $this->evaluateAndUpdateGrade($assessment, $agreementCount);
            } else {
                // Jika belum mencapai 2 persetujuan
                $assessment = TaxaQualityAssessment::firstOrCreate(
                    ['taxa_id' => $checklistId],
                    ['grade' => 'needs ID']
                );

                // Tetap update community_id_level jika ini persetujuan pertama
                if ($agreementCount === 1) {
                    $assessment->community_id_level = $agreedIdentification->identification_level;
                }

                $assessment->save();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'agreement_count' => $agreementCount,
                    'user_agreed' => true,
                    'checklist' => [
                        'taxa_id' => $agreedIdentification->taxon_id,
                        'scientific_name' => $agreedIdentification->scientific_name,
                        'iucn_status' => $agreedIdentification->iucn_red_list_category,
                        'agreement_count' => $agreementCount
                    ]
                ]
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

// Perlu diperbarui logika evaluasi grade
private function evaluateGrade($checklistId)
{
    $checklist = DB::table('fobi_checklist_taxas')
        ->where('id', $checklistId)
        ->first();

    $agreementCount = DB::table('taxa_identifications')
        ->where('checklist_id', $checklistId)
        ->where('is_agreed', true)
        ->count();

    // Update checklist
    DB::table('fobi_checklist_taxas')
        ->where('id', $checklistId)
        ->update([
            'agreement_count' => $agreementCount
        ]);

    // Update assessment
    $assessment = TaxaQualityAssessment::firstOrCreate(
        ['taxa_id' => $checklistId],
        ['grade' => 'needs ID']
    );

    if ($agreementCount < 2) {
        $assessment->community_id_level = null;
        $assessment->grade = 'needs ID';
    }

    $assessment->save();

    return $assessment->grade;
}
private function meetsResearchGradeCriteria($assessment, $agreementCount)
{
    return $assessment->has_date &&
           $assessment->has_location &&
           $assessment->has_media &&
           $agreementCount >= 2 &&
           $assessment->is_wild === true &&
           $assessment->location_accurate === true &&
           $assessment->recent_evidence === true &&
           $assessment->related_evidence === true;
}
private function meetsNeedsIdCriteria($assessment, $agreementCount, $totalIdentifications)
{
    $basicCriteria = $assessment->has_date &&
                     $assessment->has_location &&
                     $assessment->has_media;

    $identificationCriteria = $totalIdentifications < 2 || // Belum cukup identifikasi forum
                             ($agreementCount >= 2 && ($agreementCount / $totalIdentifications) < (2/3)) || // Dikonfirmasi >2 tapi kurang dari 2/3 forum
                             $agreementCount == 0; // Belum ada yang setuju

    return $basicCriteria && $identificationCriteria;
}
    private function meetsLowQualityIdCriteria($assessment, $agreementCount, $totalIdentifications)
{
    $basicCriteria = $assessment->has_date &&
                     $assessment->has_location &&
                     $assessment->has_media;

    $identificationCriteria = $totalIdentifications >= 2 && // Minimal 2 identifikasi forum
                             $agreementCount == 1; // Tepat 1 persetujuan

    return $basicCriteria && $identificationCriteria;
}

    private function determineCommunityLevel($checklistId)
    {
        $identifications = DB::table('taxa_identifications')
            ->where('checklist_id', $checklistId)
            ->select('identification_level', DB::raw('count(*) as count'))
            ->groupBy('identification_level')
            ->orderBy('count', 'desc')
            ->get();

        // Minimal 2 identifikasi yang sama untuk konsensus
        foreach ($identifications as $identification) {
            if ($identification->count >= 2) {
                return strtolower($identification->identification_level);
            }
        }

        // Jika tidak ada konsensus, ambil level tertinggi
        $firstIdentification = DB::table('taxa_identifications')
            ->where('checklist_id', $checklistId)
            ->orderBy('created_at', 'desc')
            ->first();

        return $firstIdentification ? strtolower($firstIdentification->identification_level) : null;
    }

    public function verifyLocation(Request $request, $id)
    {
        $request->validate([
            'is_accurate' => 'required|boolean',
            'comment' => 'nullable|string|max:500'
        ]);

        try {
            $userId = JWTAuth::user()->id;
            if (!$userId) {
                return response()->json(['success' => false, 'message' => 'Pengguna tidak terautentikasi'], 401);
            }

            DB::table('taxa_location_verifications')->insert([
                'checklist_id' => $id,
                'user_id' => $userId,
                'is_accurate' => $request->is_accurate,
                'comment' => $request->comment,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json(['success' => true, 'message' => 'Verifikasi lokasi berhasil ditambahkan']);
        } catch (\Exception $e) {
            Log::error('Error verifying location: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan'], 500);
        }
    }

    public function voteWildStatus(Request $request, $id)
    {
        $request->validate([
            'is_wild' => 'required|boolean',
            'comment' => 'nullable|string|max:500'
        ]);

        try {
            $userId = JWTAuth::user()->id;
            if (!$userId) {
                return response()->json(['success' => false, 'message' => 'Pengguna tidak terautentikasi'], 401);
            }

            DB::table('taxa_wild_status_votes')->insert([
                'checklist_id' => $id,
                'user_id' => $userId,
                'is_wild' => $request->is_wild,
                'comment' => $request->comment,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json(['success' => true, 'message' => 'Vote status liar berhasil ditambahkan']);
        } catch (\Exception $e) {
            Log::error('Error voting wild status: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan'], 500);
        }
    }

    public function searchTaxa(Request $request)
    {
        try {
            $query = $request->get('q');
            $page = $request->get('page', 1);
            $perPage = 5;

            if (strlen($query) < 2) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ])->header('Content-Type', 'application/json');
            }

            // Cari di database lokal dengan pagination
            $localResults = DB::table('taxas')
                ->where('scientific_name', 'LIKE', "%{$query}%")
                ->select('id', 'scientific_name', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'taxon_rank') // Tambahkan id
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            if ($localResults->isNotEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => $localResults,
                    'page' => $page
                ])->header('Content-Type', 'application/json');
            }

            // Jika tidak ada di database lokal, gunakan GBIF API dan simpan ke database
            $response = Http::get('https://api.gbif.org/v1/species/suggest', [
                'q' => $query,
                'offset' => ($page - 1) * $perPage,
                'limit' => $perPage
            ]);

            if ($response->successful()) {
                $suggestions = collect($response->json())->map(function ($item) {
                    // Simpan ke database dan dapatkan ID
                    $taxon = DB::table('taxas')->updateOrInsert(
                        ['scientific_name' => $item['scientificName']],
                        [
                            'kingdom' => $item['kingdom'] ?? '',
                            'phylum' => $item['phylum'] ?? '',
                            'class' => $item['class'] ?? '',
                            'order' => $item['order'] ?? '',
                            'family' => $item['family'] ?? '',
                            'genus' => $item['genus'] ?? '',
                            'species' => $item['species'] ?? '',
                            'taxon_rank' => strtolower($item['rank'] ?? ''),
                            'created_at' => now(),
                            'updated_at' => now()
                        ]
                    );

                    // Ambil ID taxon yang baru saja disimpan/diupdate
                    $savedTaxon = DB::table('taxas')
                        ->where('scientific_name', $item['scientificName'])
                        ->first();

                    return [
                        'id' => $savedTaxon->id,
                        'scientific_name' => $item['scientificName'] ?? '',
                        'kingdom' => $item['kingdom'] ?? '',
                        'phylum' => $item['phylum'] ?? '',
                        'class' => $item['class'] ?? '',
                        'order' => $item['order'] ?? '',
                        'family' => $item['family'] ?? '',
                        'genus' => $item['genus'] ?? '',
                        'species' => $item['species'] ?? '',
                        'taxon_rank' => strtolower($item['rank'] ?? '')
                    ];
                });

                return response()->json([
                    'success' => true,
                    'data' => $suggestions,
                    'page' => $page
                ])->header('Content-Type', 'application/json');
            }

            return response()->json([
                'success' => true,
                'data' => []
            ])->header('Content-Type', 'application/json');

        } catch (\Exception $e) {
            Log::error('Error searching taxa: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mencari taksonomi'
            ], 500)->header('Content-Type', 'application/json');
        }
    }
        public function addComment(Request $request, $id)
    {
        $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        $userId = JWTAuth::user()->id;
        if (!$userId) {
            return response()->json(['success' => false, 'message' => 'Pengguna tidak terautentikasi'], 401);
        }

        try {
            DB::table('checklist_comments')->insert([
                'checklist_id' => $id,
                'user_id' => $userId,
                'comment' => $request->comment,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json(['success' => true, 'message' => 'Komentar berhasil ditambahkan']);
        } catch (\Exception $e) {
            Log::error('Error adding comment: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan'], 500);
        }
    }
    public function rateChecklist(Request $request, $id)
    {
        $request->validate([
            'grade' => 'required|in:research grade,needs ID,casual',
        ]);

        try {
            $userId = JWTAuth::user()->id;
            if (!$userId) {
                return response()->json(['success' => false, 'message' => 'Pengguna tidak terautentikasi'], 401);
            }

            $assessment = TaxaQualityAssessment::where('taxa_id', $id)->first();
            if (!$assessment) {
                return response()->json(['success' => false, 'message' => 'Penilaian tidak ditemukan'], 404);
            }

            $assessment->update(['grade' => $request->input('grade')]);

            return response()->json(['success' => true, 'message' => 'Penilaian berhasil diperbarui']);
        } catch (\Exception $e) {
            Log::error('Error rating checklist: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan'], 500);
        }
    }
    public function getComments($id)
    {
        try {
            $comments = DB::table('checklist_comments')
                ->where('checklist_id', $id)
                ->join('fobi_users', 'checklist_comments.user_id', '=', 'fobi_users.id')
                ->select('checklist_comments.*', 'fobi_users.uname as user_name')
                ->get();

            return response()->json(['success' => true, 'data' => $comments]);
        } catch (\Exception $e) {
            Log::error('Error fetching comments: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan'], 500);
        }
    }


    public function assessQuality($id)
    {
        try {
            // Cek checklist dengan id yang diberikan
            $checklist = FobiChecklistTaxa::findOrFail($id);

            // Hitung jumlah persetujuan
            $agreementCount = DB::table('taxa_identifications')
                ->where('checklist_id', $id)
                ->where('is_agreed', true)
                ->count();

            // Ambil atau buat quality assessment
            $assessment = TaxaQualityAssessment::firstOrNew([
                'taxa_id' => $id  // Gunakan checklist id sebagai taxa_id
            ]);

            // Set nilai default berdasarkan data checklist
            if (!$assessment->exists) {
                $assessment->fill([
                    'has_date' => !empty($checklist->created_at),
                    'has_location' => !empty($checklist->latitude) && !empty($checklist->longitude),
                    'has_media' => DB::table('fobi_checklist_media')->where('checklist_id', $id)->exists(),
                    'is_wild' => true,
                    'location_accurate' => true,
                    'recent_evidence' => true,
                    'related_evidence' => true,
                    'agreement_count' => $agreementCount
                ]);
            }

            // Tentukan grade berdasarkan jumlah persetujuan
            if ($agreementCount >= 2) {
                $assessment->grade = 'research grade';
            } else if ($agreementCount == 1) {
                $assessment->grade = 'low quality ID';
            } else {
                $assessment->grade = 'needs ID';
            }

            $assessment->save();

            return response()->json([
                'success' => true,
                'data' => $assessment
            ]);

        } catch (\Exception $e) {
            Log::error('Error assessing quality: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan'
            ], 500);
        }
    }

    // Hapus fungsi setDefaultAssessment karena sudah diintegrasikan ke dalam assessQuality

    private function determineGrade($checklistId)
    {
        try {
            // Ambil data checklist
            $checklist = FobiChecklistTaxa::findOrFail($checklistId);

            // Hitung jumlah identifikasi
            $identificationCount = DB::table('taxa_identifications')
                ->where('checklist_id', $checklistId)
                ->count();

            // Ambil assessment yang ada
            $assessment = TaxaQualityAssessment::where('taxa_id', $checklistId)->first();

            if (!$assessment) {
                return 'needs ID';
            }

            // Tentukan grade
            if ($this->meetsResearchGradeCriteria($assessment, $identificationCount)) {
                return 'research grade';
            } else if ($this->meetsNeedsIdCriteria($assessment)) {
                return 'needs ID';
            }
            return 'casual';

        } catch (\Exception $e) {
            Log::error('Error determining grade: ' . $e->getMessage(), [
                'checklist_id' => $checklistId
            ]);
            return 'needs ID';
        }
    }
    public function updateQualityAssessment($checklistId)
    {
        try {
            // Ambil data checklist
            $checklist = FobiChecklistTaxa::findOrFail($checklistId);

            // Hitung jumlah identifikasi dan persetujuan
            $totalIdentifications = DB::table('taxa_identifications')
                ->where('checklist_id', $checklistId)
                ->count();

            $agreementCount = DB::table('taxa_identifications')
                ->where('checklist_id', $checklistId)
                ->where('is_agreed', true)
                ->count();

            // Ambil atau buat assessment
            $assessment = TaxaQualityAssessment::firstOrCreate(
                ['taxa_id' => $checklistId],
                [
                    'grade' => 'needs ID',
                    'has_date' => true,
                    'has_location' => !empty($checklist->latitude) && !empty($checklist->longitude),
                    'has_media' => DB::table('fobi_checklist_media')->where('checklist_id', $checklistId)->exists(),
                    'is_wild' => true,
                    'location_accurate' => true,
                    'recent_evidence' => true,
                    'related_evidence' => true
                ]
            );

            // Evaluasi grade berdasarkan kriteria
            if ($this->meetsResearchGradeCriteria($assessment, $agreementCount)) {
                $assessment->grade = 'research grade';
            } else if ($this->meetsLowQualityIdCriteria($assessment, $agreementCount, $totalIdentifications)) {
                $assessment->grade = 'low quality ID';
            } else if ($this->meetsNeedsIdCriteria($assessment, $agreementCount, $totalIdentifications)) {
                $assessment->grade = 'needs ID';
            } else {
                $assessment->grade = 'casual';
            }

            $assessment->save();

            return $assessment;

        } catch (\Exception $e) {
            Log::error('Error in updateQualityAssessment: ' . $e->getMessage());
            throw $e;
        }
    }

    public function updateImprovementStatus(Request $request, $id)
    {
        try {
            $request->validate([
                'can_be_improved' => 'required|boolean'
            ]);

            $checklist = FobiChecklistTaxa::findOrFail($id);

            // Hitung jumlah identifikasi dan persetujuan
            $totalIdentifications = DB::table('taxa_identifications')
                ->where('checklist_id', $id)
                ->count();

            $agreementCount = DB::table('taxa_identifications')
                ->where('checklist_id', $id)
                ->where('is_agreed', true)
                ->count();

            // Ambil atau buat assessment
            $assessment = TaxaQualityAssessment::firstOrCreate(
                ['taxa_id' => $id],
                [
                    'grade' => 'needs ID',
                    'has_date' => true,
                    'has_location' => !empty($checklist->latitude) && !empty($checklist->longitude),
                    'has_media' => DB::table('fobi_checklist_media')->where('checklist_id', $id)->exists(),
                    'is_wild' => true,
                    'location_accurate' => true,
                    'recent_evidence' => true,
                    'related_evidence' => true,
                    'can_be_improved' => null // default value
                ]
            );

            $assessment->can_be_improved = $request->can_be_improved;

            // Evaluasi grade berdasarkan can_be_improved dan kriteria lainnya
            if ($request->can_be_improved) {
                if ($this->meetsNeedsIdCriteria($assessment, $agreementCount, $totalIdentifications)) {
                    $assessment->grade = 'needs ID';
                }
            } else {
                if ($this->meetsResearchGradeCriteria($assessment, $agreementCount, $totalIdentifications)) {
                    $assessment->grade = 'research grade';
                } else if ($this->meetsLowQualityIdCriteria($assessment, $agreementCount, $totalIdentifications)) {
                    $assessment->grade = 'low quality ID';
                }
            }

            $assessment->save();

            return response()->json([
                'success' => true,
                'data' => $assessment,
                'message' => 'Status berhasil diperbarui'
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating improvement status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui status'
            ], 500);
        }
    }
        private function meetsAllCriteria($assessment, $checklistId)
    {
        // Cek identifikasi menggunakan checklist id
        $identificationCount = DB::table('taxa_identifications')
            ->where('checklist_id', $checklistId)
            ->count();

        $latestIdentification = DB::table('taxa_identifications')
            ->where('checklist_id', $checklistId)
            ->orderBy('created_at', 'desc')
            ->first();

        // Periksa community_id_level dari assessment
        $isSpeciesLevel = $assessment->community_id_level === 'species' || $assessment->community_id_level === 'subspecies' || $assessment->community_id_level === 'variety';

        return $assessment->has_date &&
               $assessment->has_location &&
               $assessment->has_media &&
               $assessment->is_wild &&
               $assessment->location_accurate &&
               $assessment->recent_evidence &&
               $assessment->related_evidence &&
               $isSpeciesLevel &&
               $identificationCount >= 2;
    }

    public function getRelatedLocations($taxaId)
    {
        try {
            // Ambil semua checklist dengan taxa_id yang sama
            $relatedLocations = DB::table('fobi_checklist_taxas as fct')
                ->join('taxa_quality_assessments as tqa', 'fct.id', '=', 'tqa.taxa_id')
                ->where('fct.taxa_id', $taxaId)
                ->select(
                    'fct.id',
                    'fct.latitude',
                    'fct.longitude',
                    'fct.scientific_name',
                    'fct.created_at',
                    'tqa.grade'
                )
                ->get();

            // Format response
            $formattedLocations = $relatedLocations->map(function($location) {
                return [
                    'id' => $location->id,
                    'latitude' => $location->latitude,
                    'longitude' => $location->longitude,
                    'scientific_name' => $location->scientific_name,
                    'created_at' => $location->created_at,
                    'grade' => $location->grade
                ];
            });

            return response()->json($formattedLocations);

        } catch (\Exception $e) {
            Log::error('Error getting related locations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil lokasi terkait'
            ], 500);
        }
    }

    public function cancelAgreement($checklistId, $identificationId)
    {
        try {
            DB::beginTransaction();

            $user = JWTAuth::user();

            // Hapus sub-identifikasi (persetujuan)
            $deleted = DB::table('taxa_identifications')
                ->where('checklist_id', $checklistId)
                ->where('user_id', $user->id)
                ->where('agrees_with_id', $identificationId)
                ->where('is_agreed', true)
                ->delete();

            if (!$deleted) {
                throw new \Exception('Persetujuan tidak ditemukan');
            }

            // Update jumlah persetujuan
            $agreementCount = DB::table('taxa_identifications')
                ->where('agrees_with_id', $identificationId)
                ->where('is_agreed', true)
                ->count();

            // Update agreement_count di fobi_checklist_taxas
            DB::table('fobi_checklist_taxas')
                ->where('id', $checklistId)
                ->update([
                    'agreement_count' => $agreementCount
                ]);

            // Update assessment jika agreement count < 2
            if ($agreementCount < 2) {
                // Update checklist agreement count
                DB::table('fobi_checklist_taxas')
                    ->where('id', $checklistId)
                    ->update([
                        'agreement_count' => $agreementCount
                    ]);

                // Update assessment
                $assessment = TaxaQualityAssessment::where('taxa_id', $checklistId)->first();
                if ($assessment) {
                    $assessment->grade = 'needs ID';
                    $assessment->community_id_level = null; // Reset level identifikasi komunitas
                    $assessment->save();
                }
            }
            // Hanya update community consensus
            $this->updateCommunityConsensus($checklistId);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Persetujuan berhasil dibatalkan',
                'data' => [
                    'agreement_count' => $agreementCount,
                    'grade' => $agreementCount < 2 ? 'needs ID' : 'research grade'
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in cancelAgreement: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    // Tambahkan method untuk menolak identifikasi
    public function disagreeWithIdentification(Request $request, $checklistId, $identificationId)
    {
        $request->validate([
            'taxon_id' => 'nullable|exists:taxas,id',
            'identification_level' => 'required|string',
            'photo' => 'nullable|image|max:2048', // Validasi untuk foto
        ]);

        try {
            DB::beginTransaction();

            $user = JWTAuth::user();

            // Simpan foto jika ada
            $photoPath = null;
            if ($request->hasFile('photo')) {
                $photoPath = $request->file('photo')->store('identification_photos', 'public');
            }

            // Simpan penolakan identifikasi
            DB::table('taxa_identifications')->insert([
                'checklist_id' => $checklistId,
                'user_id' => $user->id,
                'taxon_id' => $request->taxon_id,
                'identification_level' => $request->identification_level,
                'comment' => $request->comment,
                'photo_path' => $photoPath,
                'is_agreed' => false,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Penolakan identifikasi berhasil disimpan'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error disagreeing with identification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menolak identifikasi'
            ], 500);
        }
    }
    public function getObservations(Request $request)
    {
        try {
            // Log semua parameter request untuk debugging
            Log::info('Request parameters:', $request->all());
            
            // Definisikan nilai ENUM yang valid
            $validGrades = ['research grade', 'needs id', 'low quality id', 'casual'];

            // Validasi request
            $request->validate([
                'grade' => 'nullable|array',
                'grade.*' => ['nullable', Rule::in($validGrades)],
                'per_page' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1',
                'data_source' => 'nullable|array',
                'data_source.*' => 'nullable|string',
                'has_media' => 'nullable|boolean',
                'media_type' => 'nullable|string|in:photo,audio',
                'search' => 'nullable|string',
                'latitude' => 'nullable|numeric',
                'longitude' => 'nullable|numeric',
                'radius' => 'nullable|numeric|min:1',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date',
            ]);

            $perPage = $request->input('per_page', 100);

// Step 1: Ambil ID observations dengan filter dasar
$baseQuery = DB::table('fobi_checklist_taxas')
->select('fobi_checklist_taxas.id')
->join('taxa_quality_assessments', 'fobi_checklist_taxas.id', '=', 'taxa_quality_assessments.taxa_id');

// Terapkan filter dasar dan pengurutan
$baseQuery->orderBy('fobi_checklist_taxas.created_at', 'desc'); // Tambahkan pengurutan di sini

if ($request->has('search')) {
$search = $request->search;
$baseQuery->where(function($q) use ($search) {
    $q->where('fobi_checklist_taxas.scientific_name', 'like', "%{$search}%")
      ->orWhere('fobi_checklist_taxas.genus', 'like', "%{$search}%")
      ->orWhere('fobi_checklist_taxas.species', 'like', "%{$search}%")
      ->orWhere('fobi_checklist_taxas.family', 'like', "%{$search}%");
});
}

if ($request->has('grade') && is_array($request->grade)) {
$grades = array_map('strtolower', $request->grade);
$baseQuery->whereIn(DB::raw('LOWER(taxa_quality_assessments.grade)'), $grades);
}

// Filter lokasi dan tanggal
if ($request->has('latitude') && $request->has('longitude')) {
$lat = $request->latitude;
$lng = $request->longitude;
$radius = $request->radius ?? 10;

$baseQuery->whereRaw("
    ST_Distance_Sphere(
        point(fobi_checklist_taxas.longitude, fobi_checklist_taxas.latitude),
        point(?, ?)
    ) <= ?
", [$lng, $lat, $radius * 1000]);
}

// Filter tanggal
if ($request->has('start_date')) {
$baseQuery->where('fobi_checklist_taxas.created_at', '>=', $request->start_date);
}
if ($request->has('end_date')) {
$baseQuery->where('fobi_checklist_taxas.created_at', '<=', $request->end_date);
}

if ($request->has('polygon')) {
    $polygonCoords = explode('|', $request->polygon);
    $polygonPoints = [];
    
    foreach ($polygonCoords as $coord) {
        list($lng, $lat) = explode(',', $coord);
        $polygonPoints[] = [$lng, $lat];
    }
    
    $minLat = $maxLat = $polygonPoints[0][1];
    $minLng = $maxLng = $polygonPoints[0][0];
    
    foreach ($polygonPoints as $point) {
        $minLat = min($minLat, $point[1]);
        $maxLat = max($maxLat, $point[1]);
        $minLng = min($minLng, $point[0]);
        $maxLng = max($maxLng, $point[0]);
    }
    
    $baseQuery->where('fobi_checklist_taxas.latitude', '>=', $minLat)
              ->where('fobi_checklist_taxas.latitude', '<=', $maxLat)
              ->where('fobi_checklist_taxas.longitude', '>=', $minLng)
              ->where('fobi_checklist_taxas.longitude', '<=', $maxLng);
    
    $request->merge(['polygon_points' => $polygonPoints]);
}

// Step 2: Paginate IDs
$observationIds = $baseQuery
->pluck('id'); // Hapus orderBy di sini karena sudah diurutkan di atas

// Step 3: Ambil detail observations dengan eager loading dan tetap urutannya
$observations = DB::table('fobi_checklist_taxas')
->whereIn('fobi_checklist_taxas.id', $observationIds)
->orderByRaw("FIELD(fobi_checklist_taxas.id, " . implode(',', $observationIds->toArray()) . ")") // Tambahkan ini untuk mempertahankan urutan
->join('taxa_quality_assessments', 'fobi_checklist_taxas.id', '=', 'taxa_quality_assessments.taxa_id')
->join('fobi_users', 'fobi_checklist_taxas.user_id', '=', 'fobi_users.id')
->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
->select([
    'fobi_checklist_taxas.id',
    'fobi_checklist_taxas.taxa_id',
    'fobi_checklist_taxas.scientific_name',
    'fobi_checklist_taxas.genus',
    'fobi_checklist_taxas.species',
    'fobi_checklist_taxas.family',
    'taxas.cname_species',
    'fobi_checklist_taxas.latitude',
    'fobi_checklist_taxas.longitude',
    'fobi_checklist_taxas.date as observation_date',
    'fobi_checklist_taxas.created_at',
    'taxa_quality_assessments.grade',
    'taxa_quality_assessments.has_media',
    'taxa_quality_assessments.needs_id',
    'fobi_users.uname as observer_name',
    'fobi_users.id as observer_id'
])
->paginate($perPage);

// Step 4: Ambil semua media dalam satu query
$mediaData = DB::table('fobi_checklist_media')
->whereIn('checklist_id', $observations->pluck('id'))
->get()
->groupBy('checklist_id');

// Step 5: Ambil fobi counts dalam satu query
$fobiCounts = DB::table('fobi_checklist_taxas')
->whereIn('taxa_id', $observations->pluck('taxa_id'))
->select('taxa_id', DB::raw('count(*) as count'))
->groupBy('taxa_id')
->pluck('count', 'taxa_id');

// Step 6: Format data
foreach ($observations as $observation) {
$medias = $mediaData[$observation->id] ?? collect();

$observation->images = [];
$observation->audioUrl = null;
$observation->spectrogram = null;

foreach ($medias as $media) {
    if ($media->media_type === 'photo') {
        $observation->images[] = [
            'id' => $media->id,
            'media_type' => 'photo',
            'url' => asset('storage/' . $media->file_path)
        ];
    } else if ($media->media_type === 'audio') {
        $observation->audioUrl = asset('storage/' . $media->file_path);
        $observation->spectrogram = asset('storage/' . $media->spectrogram);
    }
}

$observation->image = !empty($observation->images)
    ? $observation->images[0]['url']
    : asset('images/default-thumbnail.jpg');

$observation->fobi_count = $fobiCounts[$observation->taxa_id] ?? 0;
$observation->source = 'fobi';

// Di method getObservations
$observation->total_identifications = DB::table('taxa_identifications')
    ->where('checklist_id', $observation->id)
    ->whereNull('burnes_checklist_id')
    ->whereNull('kupnes_checklist_id')
    ->where(function($query) {
        $query->where('is_agreed', true)
              ->orWhereNull('is_agreed');
    })
    ->where(function($query) {
        $query->where('is_withdrawn', false)
              ->orWhereNull('is_withdrawn');
    })
    ->count();

// Juga tambahkan perhitungan agreement count
$observation->agreement_count = DB::table('taxa_identifications')
    ->where('checklist_id', $observation->id)
    ->where('is_agreed', true)
    ->whereNull('burnes_checklist_id')
    ->whereNull('kupnes_checklist_id')
    ->where('is_withdrawn', false)
    ->count();
}

return response()->json([
'success' => true,
'data' => $observations->items(),
'meta' => [
    'current_page' => $observations->currentPage(),
    'per_page' => $perPage,
    'total' => $observations->total(),
    'last_page' => $observations->lastPage()
],
'links' => [
    'first' => $observations->url(1),
    'last' => $observations->url($observations->lastPage()),
    'prev' => $observations->previousPageUrl(),
    'next' => $observations->nextPageUrl()
]
]);

} catch (\Exception $e) {
// Perbaiki format logging error
Log::error('Error in getObservations:', ['message' => $e->getMessage()]);
Log::error('Stack trace:', ['trace' => $e->getTraceAsString()]);

return response()->json([
'success' => false,
'message' => 'Terjadi kesalahan saat mengambil data observasi: ' . $e->getMessage()
], 500);
}
}

public function getUserObservations(Request $request)
    {
        try {
            $userId = JWTAuth::parseToken()->authenticate()->id;
            $perPage = $request->input('per_page', 50);

            $observations = DB::table('fobi_checklist_taxas')
                ->join('taxa_quality_assessments', 'fobi_checklist_taxas.id', '=', 'taxa_quality_assessments.taxa_id')
                ->join('fobi_users', 'fobi_checklist_taxas.user_id', '=', 'fobi_users.id')
                ->join('taxas', 'fobi_checklist_taxas.taxa_id', '=', 'taxas.id')
                ->where('fobi_checklist_taxas.user_id', $userId)
                ->select(
                    'fobi_checklist_taxas.*',
                    'taxa_quality_assessments.grade',
                    'taxa_quality_assessments.has_media',
                    'taxa_quality_assessments.is_wild',
                    'taxa_quality_assessments.location_accurate',
                    'taxa_quality_assessments.recent_evidence',
                    'taxa_quality_assessments.related_evidence',
                    'taxa_quality_assessments.needs_id',
                    'taxa_quality_assessments.community_id_level',
                    'fobi_users.uname as observer_name',
                    DB::raw('(SELECT COUNT(DISTINCT user_id) FROM taxa_identifications WHERE checklist_id = fobi_checklist_taxas.id) as identifications_count')
                )
                ->orderBy('fobi_checklist_taxas.created_at', 'desc')
                ->paginate($perPage);

            // Proses setiap observasi untuk menambahkan media
            foreach ($observations as $observation) {
                // Ambil media
                $medias = DB::table('fobi_checklist_media')
                    ->where('checklist_id', $observation->id)
                    ->get();

                $observation->images = [];
                $observation->audioUrl = null;
                $observation->spectrogram = null;

                foreach ($medias as $media) {
                    if ($media->media_type === 'photo') {
                        $observation->images[] = [
                            'id' => $media->id,
                            'url' => asset('storage/' . $media->file_path)
                        ];
                    } else if ($media->media_type === 'audio') {
                        $observation->audioUrl = asset('storage/' . $media->file_path);
                        $observation->spectrogram = asset('storage/' . $media->spectrogram);
                    }
                }
                $observation->fobi_count = DB::table('fobi_checklist_taxas')
                ->where('taxa_id', $observation->taxa_id)
                ->count();

            }

            return response()->json([
                'success' => true,
                'data' => $observations->items(),
                'meta' => [
                    'current_page' => $observations->currentPage(),
                    'per_page' => $observations->perPage(),
                    'total' => $observations->total(),
                    'last_page' => $observations->lastPage()
                ],
                'links' => [
                    'first' => $observations->url(1),
                    'last' => $observations->url($observations->lastPage()),
                    'prev' => $observations->previousPageUrl(),
                    'next' => $observations->nextPageUrl()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching user observations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data observasi pengguna'
            ], 500);
        }
    }
}


