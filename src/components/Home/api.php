<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\HomeController;
use App\Http\Controllers\Api\GalleryController;
use App\Http\Controllers\Api\FobiUserController;
use App\Http\Controllers\Api\KupunesiaObservationApiController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SpeciesSuggestionController;
use App\Http\Controllers\Api\KupunesiaObservationController;
use App\Http\Controllers\Api\BirdObservationController;
use App\Http\Controllers\Api\KupunesiaQualityAssessmentController;
use App\Http\Controllers\Api\ChecklistObservationController;
use App\Http\Controllers\Api\ChecklistQualityAssessmentController;
use App\Http\Controllers\Api\UnifiedObservationController;
use App\Http\Controllers\Api\FobiMarkerController;
use App\Http\Controllers\Api\GridCellController;
use App\Http\Controllers\Api\ChecklistDetailController;
use App\Http\Controllers\Api\ChecklistController;
use App\Http\Controllers\Api\SpeciesController;
use App\Http\Controllers\Api\SpeciesSearchController;
use App\Http\Controllers\Api\BurungnesiaChecklistController;
use App\Http\Controllers\Api\KupunesiaChecklistController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SpeciesGalleryController;
use App\Http\Controllers\Api\GenusGalleryController;
use App\Http\Controllers\Api\GridSpeciesController;
use App\Http\Controllers\Api\TaxonomyGalleryController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/


Route::middleware('jwt.auth')->get('/user', function (Request $request) {
    return $request->user();
});

Route::group(['middleware' => ['jwt.verify']], function() {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('logout', [FobiUserController::class, 'logout']);
    Route::get('fobi-users/{id}', [FobiUserController::class, 'getUser']);
    // Tambahkan route lain yang memerlukan autentikasi di sini
});


Route::get('/order-faunas', [HomeController::class, 'getOrderFaunas']);
Route::get('/checklists', [HomeController::class, 'getChecklists']);
Route::get('/families', [HomeController::class, 'getFamilies']);
Route::get('/ordos', [HomeController::class, 'getOrdos']);
Route::get('/faunas', [HomeController::class, 'getFaunas']);
Route::get('/taxontest', [HomeController::class, 'getTaxontest']);
Route::get('/burungnesia-count', [HomeController::class, 'getBurungnesiaCount']);
Route::get('/kupunesia-count', [HomeController::class, 'getKupunesiaCount']);
Route::get('/fobi-count', [HomeController::class, 'getFobiCount']);
Route::get('/user-burungnesia-count/{userId}', [HomeController::class, 'getUserBurungnesiaCount']);
Route::get('/user-kupunesia-count/{userId}', [HomeController::class, 'getUserKupunesiaCount']);
Route::get('/user-total-observations/{userId}', [HomeController::class, 'getUserTotalObservations']);
Route::get('/total-species', [HomeController::class, 'getTotalSpecies']);
Route::get('/total-contributors', [HomeController::class, 'getTotalContributors']);
Route::get('/gallery', [GalleryController::class, 'index']);
// Route::post('/grid-contributors', [HomeController::class, 'getGridContributors']);
// Route::post('/grid-species-count', [HomeController::class, 'getGridSpeciesCount']);


use App\Http\Controllers\MapController;

Route::get('/map/{genus}', [MapController::class, 'apiMap']);
use App\Http\Controllers\FobiUploadController;

   Route::get('/checklists/{checklistId}/media', [FobiUploadController::class, 'getChecklistsWithMedia']);
   // routes/api.php

   Route::get('/species/{fauna_id}', [SpeciesController::class, 'getSpecies']);
   Route::get('/species/detail/{fauna_id}', [SpeciesController::class, 'showSpeciesDetail']);
   Route::get('/species', [SpeciesController::class, 'getSpeciesByLocation']);
   use App\Http\Controllers\TaxaAnimaliaController;

   Route::get('/taxa-animalia', [TaxaAnimaliaController::class, 'index']);


   use App\Http\Controllers\Api\FobiObservationApiController;
Route::get('/faunas', [FobiObservationApiController::class, 'getFaunaId']);
Route::post('/generate-spectrogram', [FobiObservationApiController::class, 'generateSpectrogram']);

   // routes/api.php
   Route::middleware('auth:api')->post('/checklist-fauna', [FobiObservationApiController::class, 'storeChecklistAndFauna']);
   Route::post('/fauna', [FobiObservationApiController::class, 'storeFauna']);
Route::post('/media', [FobiObservationApiController::class, 'storeMedia']);
Route::put('/images/{id}', [FobiObservationApiController::class, 'updatePhoto']);
Route::delete('/images/{id}', [FobiObservationApiController::class, 'deletePhoto']);
Route::middleware(['auth:api'])->group(function () {
    Route::prefix('observations')->group(function () {
        Route::post('{id}/identify', [FobiObservationApiController::class, 'addIdentification']);
        Route::post('{id}/verify-location', [FobiObservationApiController::class, 'verifyLocation']);
        Route::post('{id}/vote-wild', [FobiObservationApiController::class, 'voteWildStatus']);
        Route::post('{id}/verify-evidence', [FobiObservationApiController::class, 'verifyEvidence']);
    });
});
use App\Http\Controllers\Api\MarkerController;

Route::get('/markers', [MarkerController::class, 'getMarkers']);
Route::get('/fobi-markers', [FobiMarkerController::class, 'getMarkers']);
Route::get('/fobi-species/{checklist_id}/{source}', [FobiMarkerController::class, 'getSpeciesInChecklist']);

Route::get('/grid-species/{checklist_id}', [GridSpeciesController::class, 'getSpeciesInChecklist']);
Route::post('register', [FobiUserController::class, 'register']);
Route::post('login', [FobiUserController::class, 'login']);
Route::get('verify-email/{token}/{type}', [FobiUserController::class, 'verifyEmail']);
Route::post('/resend-verification', [FobiUserController::class, 'resendVerification']);
Route::post('/forgot-password', [FobiUserController::class, 'forgotPassword']);
Route::post('/reset-password', [FobiUserController::class, 'resetPassword']);

Route::get('user-profile/{id}', [FobiUserController::class, 'getUserProfile']);
// Route group untuk profile
Route::prefix('profile')->group(function () {
    // Route untuk mendapatkan profil user yang sedang login
    Route::get('/', [ProfileController::class, 'getUserProfile'])->middleware('auth:api');

    Route::get('/home/{id}', [ProfileController::class, 'getHomeProfile']);
    Route::get('/observations/{id}', [ProfileController::class, 'getUserObservations']);
    Route::get('/species/{id}', [ProfileController::class, 'getSpecies']);
    Route::get('/identifications/{id}', [ProfileController::class, 'getIdentifications']);
    Route::post('/update', [ProfileController::class, 'update'])->middleware('auth:api');
    Route::get('/activity/{id}', [ProfileController::class, 'getActivity']);
    Route::get('/activities/{id}', [ProfileController::class, 'getUserActivities']);
    Route::get('/top-taxa/{id}', [ProfileController::class, 'getTopTaxa']);
    Route::get('/search-suggestions', [ProfileController::class, 'getSearchSuggestions']);
    Route::get('/grid-observations/{id}', [ProfileController::class, 'getGridObservations']);
    Route::post('/delete-account', [ProfileController::class, 'deleteAccount'])->middleware('auth:api');
    Route::post('/update-email', [ProfileController::class, 'updateEmail'])->middleware('auth:api');

});

// Route group untuk autentikasi
Route::middleware('auth:api')->group(function () {
    // Sesuaikan dengan endpoint yang dipanggil di frontend
    Route::post('/sync-platform-email/{platform}', [ProfileController::class, 'syncPlatformEmail']);
    Route::post('/resend-platform-verification/{platform}', [ProfileController::class, 'resendPlatformVerification']);
    Route::post('/unlink-platform-account/{platform}', [ProfileController::class, 'unlinkPlatformAccount']);
});

use App\Http\Controllers\Api\SearchController;
Route::get('/search', [SearchController::class, 'search']);

// Routes untuk Kupunesia
Route::middleware(['auth:api'])->group(function () {

    // Route untuk pencarian fauna
    Route::get('/kupunesia/faunas', [KupunesiaObservationApiController::class, 'getFaunaId']);

    // Route untuk menyimpan checklist dan fauna
    Route::post('/kupunesia/checklist-fauna', [KupunesiaObservationApiController::class, 'storeChecklistAndFauna']);

    // Route untuk generate spectrogram
    Route::post('/kupunesia/generate-spectrogram', [KupunesiaObservationApiController::class, 'generateSpectrogram']);

    // Routes untuk quality assessment Kupunesia
    Route::prefix('kupunesia/observations')->group(function () {
        Route::post('{id}/identify', [KupunesiaObservationApiController::class, 'addIdentification']);
        Route::post('{id}/verify-location', [KupunesiaObservationApiController::class, 'verifyLocation']);
        Route::post('{id}/vote-wild', [KupunesiaObservationApiController::class, 'voteWildStatus']);
        Route::post('{id}/verify-evidence', [KupunesiaObservationApiController::class, 'verifyEvidence']);
    });
});




use App\Http\Controllers\Api\FobiUserApiController;

Route::prefix('fobi-users')->group(function () {
    Route::get('/', [FobiUserApiController::class, 'index']); // Mendapatkan daftar semua pengguna
    Route::get('/{id}', [FobiUserApiController::class, 'show']); // Mendapatkan detail pengguna berdasarkan ID
    Route::post('/', [FobiUserApiController::class, 'store']); // Membuat pengguna baru
    Route::put('/{id}', [FobiUserApiController::class, 'update']); // Memperbarui pengguna
    Route::delete('/{id}', [FobiUserApiController::class, 'destroy']); // Menghapus pengguna
});
use App\Http\Controllers\Api\FobiGeneralObservationController;

Route::middleware('auth:api')->group(function () {
    Route::post('/observations', [FobiGeneralObservationController::class, 'store']);
    Route::post('/observations/generate-spectrogram', [FobiGeneralObservationController::class, 'generateSpectrogram']);
//     Route::get('observations/{id}', [FobiGeneralObservationController::class, 'getChecklistDetail']);
//     Route::post('/observations/{id}/identifications', [FobiGeneralObservationController::class, 'addIdentification']);
//     Route::post('observations/{id}/curator-verify', [FobiGeneralObservationController::class, 'curatorVerification']);


//     // Update kriteria penilaian spesifik
//     Route::put('/observations/{id}/quality-assessment/{criteria}', [FobiGeneralObservationController::class, 'updateQualityAssessment']);

//     // Endpoint untuk mengubah grade secara manual (opsional)
//     Route::post('/observations/{id}/rate', [FobiGeneralObservationController::class, 'rateChecklist']);
//     Route::get('observations/{id}/quality-assessment', [FobiGeneralObservationController::class, 'assessQuality']);
//     Route::post('/observations/{checklistId}/identifications/{identificationId}/agree',
//     [FobiGeneralObservationController::class, 'agreeWithIdentification']);
//     Route::put('/observations/{id}/improvement-status', [FobiGeneralObservationController::class, 'updateImprovementStatus']);
//     Route::post('/observations/{checklistId}/identifications/{identificationId}/withdraw',
//     [FobiGeneralObservationController::class, 'withdrawIdentification']
// )->name('observations.identifications.withdraw');
// Route::post('observations/{checklistId}/identifications/{identificationId}/cancel-agreement',
// [FobiGeneralObservationController::class, 'cancelAgreement']);
// Route::post('observations/{checklistId}/identifications/{identificationId}/disagree',
// [FobiGeneralObservationController::class, 'disagreeWithIdentification']);
//     Route::prefix('observations')->group(function () {
//         Route::post('/{id}/identify', [FobiGeneralObservationController::class, 'addIdentification']);
//         Route::post('/{id}/verify-location', [FobiGeneralObservationController::class, 'verifyLocation']);
//         Route::post('/{id}/vote-wild', [FobiGeneralObservationController::class, 'voteWildStatus']);

//         // Rute untuk komentar
//         Route::get('/{id}/comments', [FobiGeneralObservationController::class, 'getComments']);
//         Route::post('/{id}/comments', [FobiGeneralObservationController::class, 'addComment']);

//         // Rute untuk penilaian grade
//         Route::post('/{id}/rate', [FobiGeneralObservationController::class, 'rateChecklist']);
//          // Get dan update quality assessment

    });
//     Route::get('/taxa/search', [FobiGeneralObservationController::class, 'searchTaxa']);
//     Route::get('/taxonomy/search', [FobiGeneralObservationController::class, 'searchTaxa']);

// });
// Route::get('/observations/{id}/assess-quality', [FobiGeneralObservationController::class, 'assessQuality']);
// Route::get('/observations/related-locations/{taxaId}', [FobiGeneralObservationController::class, 'getRelatedLocations']);
// Route::get('/taxonomy', [FobiGeneralObservationController::class, 'getTaxonomy'])
//     ->middleware('auth:api');
    // Route::get('/needs-identification', [FobiGeneralObservationController::class, 'getNeedsIdentification']);

use App\Http\Controllers\Api\QualityAssessmentController;

Route::middleware('auth:api')->group(function () {
    Route::apiResource('quality-assessments', QualityAssessmentController::class);
    Route::post('quality-assessments/identify', [QualityAssessmentController::class, 'addIdentification']);
    Route::post('quality-assessments/verify-location', [QualityAssessmentController::class, 'verifyLocation']);
    Route::post('quality-assessments/vote-wild-status', [QualityAssessmentController::class, 'voteWildStatus']);
    Route::post('quality-assessments/verify-evidence', [QualityAssessmentController::class, 'verifyEvidence']);
});
use App\Http\Controllers\Api\FobiChecklistTaxaController;

Route::middleware('jwt.verify')->group(function () {
    Route::post('/fobi-checklist-taxas', [FobiChecklistTaxaController::class, 'store']);
});
Route::get('/tiles/{z}/{x}/{y}', [MarkerController::class, 'getTileData']);
// Route::get('/taxonomy', [FobiGeneralObservationController::class, 'getTaxonomy']);
Route::middleware('auth:api')->group(function () {
    Route::post('/comments', [CommentController::class, 'store']);
    Route::get('/comments/{checklistTaxaId}', [CommentController::class, 'getComments']);
});

Route::get('/general-observations', [FobiGeneralObservationController::class, 'getObservations']);
Route::get('/bird-observations', [FobiObservationApiController::class, 'getObservations']);
Route::get('/butterfly-observations', [KupunesiaObservationApiController::class, 'getObservations']);

Route::get('/unified-observations', [UnifiedObservationController::class, 'getObservations']);
Route::get('generate-upload-session', [FobiGeneralObservationController::class, 'generateUploadSession']);
Route::middleware('auth:api')->group(function () {
    Route::get('/user-observations', [FobiGeneralObservationController::class, 'getUserObservations']);
    Route::get('/fobi-user-observations', [FobiObservationApiController::class, 'getUserObservations']);
    Route::get('/kupunesia-user-observations', [KupunesiaObservationApiController::class, 'getUserObservations']);
    Route::get('/user-general-observations', [FobiGeneralObservationController::class, 'getUserObservations']);

    // Bird Observations
    Route::get('/user-bird-observations', [FobiObservationApiController::class, 'getUserObservations']);

    // Butterfly Observations
    Route::get('/user-butterfly-observations', [KupunesiaObservationApiController::class, 'getUserObservations']);

});// Routes untuk FobiGeneralObservationController
    Route::get('/observations/search', [FobiGeneralObservationController::class, 'searchObservations']);
    Route::get('/kupunesia/observations/search', [KupunesiaObservationApiController::class, 'searchObservations']);
    Route::get('/burungnesia/observations/search', [FobiObservationApiController::class, 'searchObservations']);
    Route::middleware('auth:api')->group(function () {
        Route::get('/check-token', [FobiUserController::class, 'checkToken']);
        // Route::get('/user/{id}', [FobiUserController::class, 'getUser']);
    });

    Route::middleware('auth:api')->group(function () {
        // Route untuk user biasa
        Route::get('/user/identification-history', [HistoryController::class, 'getUserIdentificationHistory']);
        Route::get('/user/flags', [HistoryController::class, 'getUserFlags']);

        // Route untuk admin (level 3,4)
        Route::prefix('admin')->middleware('checkRole:3,4')->group(function () {
            Route::get('/identification-history', [HistoryController::class, 'getAllIdentificationHistory']);
            Route::get('/flags', [HistoryController::class, 'getAllFlags']);
        });

        // Route untuk detail
        Route::get('/observations/{id}/identification-history', [HistoryController::class, 'getChecklistIdentificationHistory']);
        Route::get('/observations/{id}/flags', [HistoryController::class, 'getChecklistFlags']);
    });
    Route::get('/species-suggestions', [SpeciesSuggestionController::class, 'suggest']);
// Routes untuk Burungnesia Observations
// Route::middleware('auth:api')->group(function () {
//     Route::get('/burungnesia/observations/{id}', [FobiObservationApiController::class, 'getChecklistDetail']);
// });


// Route::middleware('auth:api')->group(function () {
//     Route::get('/kupunesia/observations/{id}', [KupunesiaObservationApiController::class, 'getChecklistDetail']);
//     Route::post('/kupunesia/observations/{id}/identifications', [KupunesiaObservationApiController::class, 'addIdentification']);
//     Route::post('/kupunesia/observations/{id}/identifications/{identificationId}/agree', [KupunesiaObservationApiController::class, 'agreeWithIdentification']);
//     Route::delete('/kupunesia/observations/{id}/identifications/{identificationId}', [KupunesiaObservationApiController::class, 'withdrawIdentification']);
//     Route::post('/kupunesia/observations/{id}/identifications/{identificationId}/disagree', [KupunesiaObservationApiController::class, 'disagreeWithIdentification']);
//     Route::post('/kupunesia/observations/{id}/comments', [KupunesiaObservationApiController::class, 'addComment']);
//     Route::get('/kupunesia/observations/{id}/comments', [KupunesiaObservationApiController::class, 'getComments']);
// });
// Route::get('/kupunesia/fauna/search', [KupunesiaObservationApiController::class, 'searchFauna']);

// Grup route untuk Kupunesia dengan middleware auth:api
// Route::middleware(['auth:api'])->group(function () {
//     Route::prefix('kupunesia')->group(function () {
//         // Observasi
//         Route::get('observations/{id}', [KupunesiaObservationController::class, 'getChecklistDetail']);
//         Route::get('observations/{id}/stats', [KupunesiaObservationController::class, 'getStats']);
//         Route::get('observations/{id}/identification-history', [KupunesiaObservationController::class, 'getIdentificationHistory']);

//         // Identifikasi
//         Route::post('observations/{id}/identifications', [KupunesiaObservationController::class, 'addIdentification']);
//         Route::post('observations/{id}/identifications/{identificationId}/agree', [KupunesiaObservationController::class, 'agreeWithIdentification']);
//         Route::post('observations/{id}/identifications/{identificationId}/withdraw', [KupunesiaObservationController::class, 'withdrawIdentification']);
//         Route::post('observations/{id}/identifications/{identificationId}/cancel-agreement', [KupunesiaObservationController::class, 'cancelAgreement']);
//         Route::post('observations/{id}/identifications/{identificationId}/disagree', [KupunesiaObservationController::class, 'disagreeWithIdentification']);

//         // Verifikasi dan Penilaian
//         Route::post('observations/{id}/verify-location', [KupunesiaObservationController::class, 'verifyLocation']);
//         Route::post('observations/{id}/verify-evidence', [KupunesiaObservationController::class, 'verifyEvidence']);
//         Route::post('observations/{id}/vote-wild-status', [KupunesiaObservationController::class, 'voteWildStatus']);

//         // Komentar
//         Route::post('observations/{id}/comments', [KupunesiaObservationController::class, 'addComment']);
//         Route::get('observations/{id}/comments', [KupunesiaObservationController::class, 'getComments']);
//         Route::delete('observations/{id}/comments/{commentId}', [KupunesiaObservationController::class, 'deleteComment']);

//         // Flag/Laporan
//         Route::post('observations/{id}/flag', [KupunesiaObservationController::class, 'flagObservation']);

//         // Pencarian Fauna
//         Route::get('fauna/search', [KupunesiaObservationController::class, 'searchFauna']);
//     });
// });


// // Route untuk identifikasi kupu-kupu (Kupnes)
// Route::prefix('kupunesia')->middleware(['auth:api'])->group(function () {
//     Route::get('/butterflies/search', [ButterflyIdentificationController::class, 'searchButterflies']);

//     Route::prefix('identifications')->group(function () {
//         Route::post('/{checklistId}', [ButterflyIdentificationController::class, 'addIdentification']);
//         Route::post('/{checklistId}/withdraw', [ButterflyIdentificationController::class, 'withdrawIdentification']);
//         Route::post('/{checklistId}/agree', [ButterflyIdentificationController::class, 'agreeWithIdentification']);
//         Route::post('/{checklistId}/disagree', [ButterflyIdentificationController::class, 'disagreeWithIdentification']);
//     });
// });

// Route untuk pencarian spesies
Route::middleware(['auth:api'])->group(function () {
    Route::get('/burnes/birds/search', [BirdIdentificationController::class, 'searchBirds']);
    // Route::get('/kupunesia/butterflies/search', [ButterflyIdentificationController::class, 'searchButterflies']);
});


Route::middleware('auth:api')->group(function () {
    // General Observation Routes
    Route::prefix('observations')->group(function () {
        // Create & Upload Routes
        // Route::post('/', [ChecklistObservationController::class, 'store']);
        // Route::post('/generate-spectrogram', [ChecklistObservationController::class, 'generateSpectrogram']);

        // Detail & Search Routes
        Route::get('/{id}', [ChecklistObservationController::class, 'getObservationDetail']);
        Route::get('/related-locations/{taxaId}', [ChecklistObservationController::class, 'getRelatedLocations']);

        // Identification Routes
        Route::post('/{id}/identifications', [ChecklistObservationController::class, 'addIdentification']);
        Route::post('/{checklistId}/identifications/{identificationId}/agree', [ChecklistObservationController::class, 'agreeWithIdentification']);
        Route::post('/{checklistId}/identifications/{identificationId}/disagree', [ChecklistObservationController::class, 'disagreeWithIdentification']);
        Route::post('/{checklistId}/identifications/{identificationId}/withdraw', [ChecklistObservationController::class, 'withdrawIdentification']);
        Route::post('/{checklistId}/identifications/{identificationId}/cancel-agreement', [ChecklistObservationController::class, 'cancelAgreement']);

        // Quality Assessment Routes
        Route::get('/{id}/quality-assessment', [ChecklistQualityAssessmentController::class, 'assessQuality']);
        Route::put('/{id}/quality-assessment/{criteria}', [ChecklistQualityAssessmentController::class, 'updateQualityAssessment']);
        Route::put('/{id}/improvement-status', [ChecklistQualityAssessmentController::class, 'updateImprovementStatus']);
        Route::post('/{id}/rate', [ChecklistQualityAssessmentController::class, 'rateChecklist']);
        Route::get('/{id}/quality-assessment', [ChecklistQualityAssessmentController::class, 'getQualityAssessment']);

        // Verification Routes
        Route::post('/{id}/curator-verify', [ChecklistObservationController::class, 'curatorVerification']);
        Route::post('/{id}/verify-location', [ChecklistObservationController::class, 'verifyLocation']);
        Route::post('/{id}/vote-wild', [ChecklistObservationController::class, 'voteWildStatus']);

        // Comment Routes
        Route::get('/{id}/comments', [ChecklistObservationController::class, 'getComments']);
        Route::post('/{id}/comments', [ChecklistObservationController::class, 'addComment']);
        Route::delete('/{id}/comments/{commentId}', [ChecklistObservationController::class, 'deleteComment']);
        Route::post('/{id}/comments/{commentId}/flag', [ChecklistObservationController::class, 'flagComment']);
    });

    // Taxonomy Routes
    Route::get('/taxa/search', [ChecklistObservationController::class, 'searchTaxa']);
    Route::get('/taxonomy/search', [ChecklistObservationController::class, 'searchTaxa']);
    Route::get('/taxonomy', [ChecklistObservationController::class, 'getTaxonomy']);
});

// Public Routes
Route::get('/observations/{id}/assess-quality', [ChecklistQualityAssessmentController::class, 'assessQuality']);
Route::get('/observations/needs-id', [ChecklistObservationController::class, 'getNeedsIdObservations']);


Route::get('grid-cells', [GridCellController::class, 'findCells']);

Route::middleware('auth:api')->group(function () {
    Route::post('observations/{id}/flag', [ChecklistObservationController::class, 'addFlag']);
    Route::get('observations/{id}/flags', [ChecklistObservationController::class, 'getFlags']);
    Route::post('observations/{id}/flags/{flagId}/resolve', [ChecklistObservationController::class, 'resolveFlag']);
});
Route::get('observations/{id}/simple', [ChecklistDetailController::class, 'getDetail']);

Route::middleware(['auth:api'])->group(function () {
    Route::prefix('observations')->group(function () {
        Route::put('/{id}', [ChecklistDetailController::class, 'update']);
        Route::delete('/{id}', [ChecklistDetailController::class, 'destroy']);
        Route::delete('/{checklistId}/fauna/{faunaId}', [ChecklistDetailController::class, 'deleteFauna']);
        Route::delete('/{checklistId}/fauna/all', [ChecklistDetailController::class, 'deleteAllFauna']);

    });
});

Route::get('/faunas/search', [SpeciesSearchController::class, 'search']);

// Burungnesia routes
Route::prefix('burungnesia/checklists')->group(function () {
    Route::get('/{id}', [BurungnesiaChecklistController::class, 'getDetail']);
    Route::put('/{id}', [BurungnesiaChecklistController::class, 'update'])
        ->middleware('auth:api');
});

// Kupunesia routes
Route::prefix('kupunesia/checklists')->group(function () {
    Route::get('/{id}', [KupunesiaChecklistController::class, 'getDetail']);
    Route::put('/{id}', [KupunesiaChecklistController::class, 'update'])
        ->middleware('auth:api');
});

// Notification Routes
Route::middleware(['jwt.verify'])->group(function () {
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::get('/unread-count', [NotificationController::class, 'getUnreadCount']);
    });
});

Route::prefix('species-gallery')->group(function () {
    Route::get('/', [SpeciesGalleryController::class, 'getSpeciesGallery']);
    Route::get('/detail/{taxaId}', [SpeciesGalleryController::class, 'getSpeciesDetail']);
    Route::get('/{taxaId}/similar', [SpeciesGalleryController::class, 'getSimilarSpecies']);
    Route::get('/{taxaId}/distribution', [SpeciesGalleryController::class, 'getSpeciesDistribution']);
});

Route::prefix('genus-gallery')->group(function () {
    Route::get('/', [GenusGalleryController::class, 'getGenusGallery']);
    Route::get('/detail/{taxaId}', [GenusGalleryController::class, 'getGenusDetail']);
    Route::get('/{taxaId}/similar', [GenusGalleryController::class, 'getSimilarGenera']);
    Route::get('/{taxaId}/distribution', [GenusGalleryController::class, 'getGenusDistribution']);
});

// Route untuk Taxonomy Gallery
Route::prefix('taxonomy')->group(function () {
    Route::get('/{rank}', [TaxonomyGalleryController::class, 'getTaxaByRank']);
    Route::get('/detail/{taxaId}', [TaxonomyGalleryController::class, 'getTaxaDetail']);
    Route::get('/{taxaId}/distribution', [TaxonomyGalleryController::class, 'getTaxaDistribution']);
    Route::get('/{taxaId}/similar', [TaxonomyGalleryController::class, 'getSimilarTaxa']);
});

Route::get('/filtered-stats', [HomeController::class, 'getFilteredStats']);

Route::get('/fobi-markers-by-taxa', [FobiMarkerController::class, 'getMarkersByTaxa']);
Route::get('/markers-by-taxa', [MarkerController::class, 'getMarkersByTaxa']);

// Tambahkan route baru untuk polygon stats
Route::post('/polygon-stats', [HomeController::class, 'getPolygonStats']);

// Hapus middleware jwt.verify dan pindahkan route ke luar group
Route::post('/grid-species-count', [HomeController::class, 'getGridSpeciesCount']);
Route::post('/grid-contributors', [HomeController::class, 'getGridContributors']);

// Handle OPTIONS request
Route::options('/grid-species-count', [HomeController::class, 'handleOptions']);
Route::options('/grid-contributors', [HomeController::class, 'handleOptions']);
// Route::post('/grids-in-polygon', [HomeController::class, 'getGridsInPolygon']); 
// Route::get('/grid-data/{gridId}', [HomeController::class, 'getGridData']);

// Tambahkan route baru untuk polygon data
Route::post('/grids-in-polygon', [HomeController::class, 'getGridsInPolygon']);
Route::get('/grid-data/{gridId}', [HomeController::class, 'getGridData']);
Route::post('/observations-by-ids', [HomeController::class, 'getObservationsByIds']);
