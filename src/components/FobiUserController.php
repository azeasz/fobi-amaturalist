<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FobiUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\VerifyEmail;
use App\Mail\ResetPassword;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Carbon\Carbon;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;

class FobiUserController extends Controller
{
    public function register(Request $request)
    {
        try {
            // Log request data
            \Log::info('Registration attempt:', $request->except(['password']));

            $validatedData = $request->validate([
                'fname' => 'required|max:20',
                'lname' => 'required|max:20',
                'email' => 'required|email|max:50|unique:fobi_users,email',
                'uname' => 'required|max:50|unique:fobi_users,uname',
                'password' => 'required|min:6',
                'phone' => 'required|max:14',
                'organization' => 'required|max:50',
                'burungnesia_email' => 'nullable|email',
                'kupunesia_email' => 'nullable|email',
            ]);

            DB::beginTransaction();
            try {
                // Cek koneksi database kedua dan ketiga
                $burungnesiaUserId = null;
                $kupunesiaUserId = null;

                if ($request->burungnesia_email) {
                    try {
                        $burungnesiaUser = DB::connection('second')
                            ->table('users')
                            ->where('email', $request->burungnesia_email)
                            ->first();
                        if ($burungnesiaUser) {
                            $burungnesiaUserId = $burungnesiaUser->id;
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error checking burungnesia user:', [
                            'error' => $e->getMessage(),
                            'email' => $request->burungnesia_email
                        ]);
                    }
                }

                if ($request->kupunesia_email) {
                    try {
                        $kupunesiaUser = DB::connection('third')
                            ->table('users')
                            ->where('email', $request->kupunesia_email)
                            ->first();
                        if ($kupunesiaUser) {
                            $kupunesiaUserId = $kupunesiaUser->id;
                        }
                    } catch (\Exception $e) {
                        \Log::error('Error checking kupunesia user:', [
                            'error' => $e->getMessage(),
                            'email' => $request->kupunesia_email
                        ]);
                    }
                }

                // Create user
                $user = FobiUser::create([
                    'fname' => $request->fname,
                    'lname' => $request->lname,
                    'email' => $request->email,
                    'burungnesia_email' => $request->burungnesia_email,
                    'kupunesia_email' => $request->kupunesia_email,
                    'uname' => $request->uname,
                    'password' => Hash::make($request->password),
                    'phone' => $request->phone,
                    'organization' => $request->organization,
                    'ip_addr' => $request->ip(),
                    'level' => 1,
                    'is_approved' => 0,
                    'burungnesia_user_id' => $burungnesiaUserId,
                    'kupunesia_user_id' => $kupunesiaUserId,
                    'email_verification_token' => Str::random(60),
                    'burungnesia_email_verification_token' => $request->burungnesia_email ? Str::random(60) : null,
                    'kupunesia_email_verification_token' => $request->kupunesia_email ? Str::random(60) : null,
                ]);

                \Log::info('User created successfully:', ['user_id' => $user->id]);

                // Kirim email verifikasi
                try {
                    Mail::to($user->email)->send(new VerifyEmail($user, 'email_verification_token'));
                    \Log::info('Main verification email sent:', ['email' => $user->email]);

                    if ($request->burungnesia_email) {
                        Mail::to($request->burungnesia_email)
                            ->send(new VerifyEmail($user, 'burungnesia_email_verification_token'));
                        \Log::info('Burungnesia verification email sent:', ['email' => $request->burungnesia_email]);
                    }

                    if ($request->kupunesia_email) {
                        Mail::to($request->kupunesia_email)
                            ->send(new VerifyEmail($user, 'kupunesia_email_verification_token'));
                        \Log::info('Kupunesia verification email sent:', ['email' => $request->kupunesia_email]);
                    }
                } catch (\Exception $e) {
                    \Log::error('Error sending verification emails:', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    // Tidak throw exception, lanjutkan proses
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.',
                    'user_id' => $user->id
                ], 200);

            } catch (\Exception $e) {
                DB::rollBack();
                \Log::error('Error in registration process:', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

        } catch (\Exception $e) {
            \Log::error('Registration failed:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat registrasi',
                'error_details' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');
        $rememberMe = $request->input('remember_me', false);

        try {
            // Set custom token TTL berdasarkan remember_me
            $ttl = $rememberMe ? 10080 : 60; // 10080 menit = 7 hari (1 minggu), default 60 menit
            JWTAuth::factory()->setTTL($ttl);

            if (!$token = JWTAuth::attempt($credentials)) {
                return response()->json(['error' => 'Email atau password salah'], 401);
            }

            $user = JWTAuth::user();

            // Cek verifikasi email
            if (!$user->email_verified_at) {
                return response()->json([
                    'error' => 'EMAIL_NOT_VERIFIED',
                    'message' => 'Email belum diverifikasi',
                    'verificationStatus' => [
                        'fobi' => false,
                        'burungnesia' => $user->burungnesia_email ? false : null,
                        'kupunesia' => $user->kupunesia_email ? false : null
                    ]
                ], 403);
            }

            // Siapkan status verifikasi untuk semua email
            $verificationStatus = [
                'fobi' => $user->email_verified_at ? true : false,
                'burungnesia' => $user->burungnesia_email ?
                    ($user->burungnesia_email_verified_at ? true : false) : null,
                'kupunesia' => $user->kupunesia_email ?
                    ($user->kupunesia_email_verified_at ? true : false) : null
            ];

            // Hitung waktu kedaluwarsa token
            $expiresAt = Carbon::now()->addMinutes($ttl)->toDateTimeString();

            return response()->json([
                'token' => $token,
                'expires_at' => $expiresAt,
                'user' => [
                    'id' => $user->id,
                    'uname' => $user->uname,
                    'fname' => $user->fname,
                    'lname' => $user->lname,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'organization' => $user->organization,
                    'is_approved' => $user->is_approved,
                    'burungnesia_user_id' => $user->burungnesia_user_id,
                    'kupunesia_user_id' => $user->kupunesia_user_id,
                    'level' => $user->level,
                    'ip_addr' => $user->ip_addr,
                    'bio' => $user->bio,
                    'profile_picture' => $user->profile_picture,
                    'verificationStatus' => $verificationStatus
                ]
            ]);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Gagal membuat token'], 500);
        }
    }
    public function checkToken(Request $request)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }
            return response()->json(['user' => $user]);
        } catch (JWTException $e) {
            // Jika token tidak valid atau sudah kedaluwarsa
            return response()->json(['error' => 'Token expired or invalid'], 401);
        }
    }
    public function verifyEmail($token, $type)
    {
        try {
            $user = FobiUser::where($type, $token)->first();

            if (!$user) {
                return response()->json([
                    'error' => 'INVALID_TOKEN',
                    'message' => 'Token verifikasi tidak valid atau sudah kadaluarsa.'
                ], 400);
            }

            $verificationStatus = [
                'fobi' => $user->email_verified_at ? true : false,
                'burungnesia' => $user->burungnesia_email ?
                    ($user->burungnesia_email_verified_at ? true : false) : null,
                'kupunesia' => $user->kupunesia_email ?
                    ($user->kupunesia_email_verified_at ? true : false) : null
            ];

            switch ($type) {
                case 'email_verification_token':
                    if ($user->email_verified_at) {
                        return response()->json([
                            'message' => 'Email FOBI sudah diverifikasi sebelumnya',
                            'verificationStatus' => $verificationStatus
                        ]);
                    }
                    $user->email_verified_at = now();
                    $user->email_verification_token = null;
                    $message = 'Email FOBI berhasil diverifikasi';
                    break;

                case 'burungnesia_email_verification_token':
                    if ($user->burungnesia_email_verified_at) {
                        return response()->json([
                            'message' => 'Email Burungnesia sudah diverifikasi sebelumnya',
                            'verificationStatus' => $verificationStatus
                        ]);
                    }
                    $user->burungnesia_email_verified_at = now();
                    $user->burungnesia_email_verification_token = null;
                    $message = 'Email Burungnesia berhasil diverifikasi';
                    break;

                case 'kupunesia_email_verification_token':
                    if ($user->kupunesia_email_verified_at) {
                        return response()->json([
                            'message' => 'Email Kupunesia sudah diverifikasi sebelumnya',
                            'verificationStatus' => $verificationStatus
                        ]);
                    }
                    $user->kupunesia_email_verified_at = now();
                    $user->kupunesia_email_verification_token = null;
                    $message = 'Email Kupunesia berhasil diverifikasi';
                    break;

                default:
                    return response()->json([
                        'error' => 'INVALID_TOKEN_TYPE',
                        'message' => 'Tipe token tidak valid'
                    ], 400);
            }

            // Update status approval jika semua email yang diperlukan sudah diverifikasi
            if ($user->email_verified_at &&
                (!$user->burungnesia_email || $user->burungnesia_email_verified_at) &&
                (!$user->kupunesia_email || $user->kupunesia_email_verified_at)) {
                $user->is_approved = 1;
            }

            $user->save();

            // Update verification status setelah verifikasi
            $verificationStatus = [
                'fobi' => $user->email_verified_at ? true : false,
                'burungnesia' => $user->burungnesia_email ?
                    ($user->burungnesia_email_verified_at ? true : false) : null,
                'kupunesia' => $user->kupunesia_email ?
                    ($user->kupunesia_email_verified_at ? true : false) : null
            ];

            return response()->json([
                'success' => true,
                'message' => $message,
                'verificationStatus' => $verificationStatus,
                'isFullyVerified' => $user->is_approved == 1
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'SERVER_ERROR',
                'message' => 'Terjadi kesalahan saat memverifikasi email'
            ], 500);
        }
    }

    public function resendVerification(Request $request)
    {
        try {
            $user = FobiUser::where('email', $request->email)->first();

            if (!$user) {
                return response()->json([
                    'error' => 'USER_NOT_FOUND',
                    'message' => 'Email tidak ditemukan'
                ], 404);
            }

            \Log::info('Starting resend verification process for:', ['email' => $user->email]);

            // Cek dan kirim email FOBI jika belum terverifikasi
            if (!$user->email_verified_at) {
                $user->email_verification_token = Str::random(60);
                Mail::to($user->email)->send(new VerifyEmail($user, 'email_verification_token'));
                \Log::info('FOBI verification email sent to:', ['email' => $user->email]);
            }

            // Hanya kirim email Burungnesia jika email FOBI sudah terverifikasi
            if ($user->email_verified_at &&
                $user->burungnesia_email &&
                !$user->burungnesia_email_verified_at) {
                $user->burungnesia_email_verification_token = Str::random(60);
                Mail::to($user->burungnesia_email)
                    ->send(new VerifyEmail($user, 'burungnesia_email_verification_token'));
                \Log::info('Burungnesia verification email sent to:', ['email' => $user->burungnesia_email]);
            }

            // Hanya kirim email Kupunesia jika email FOBI sudah terverifikasi
            if ($user->email_verified_at &&
                $user->kupunesia_email &&
                !$user->kupunesia_email_verified_at) {
                $user->kupunesia_email_verification_token = Str::random(60);
                Mail::to($user->kupunesia_email)
                    ->send(new VerifyEmail($user, 'kupunesia_email_verification_token'));
                \Log::info('Kupunesia verification email sent to:', ['email' => $user->kupunesia_email]);
            }

            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Email verifikasi telah dikirim ulang',
                'verificationStatus' => [
                    'fobi' => $user->email_verified_at ? true : false,
                    'burungnesia' => $user->burungnesia_email ?
                        ($user->burungnesia_email_verified_at ? true : false) : null,
                    'kupunesia' => $user->kupunesia_email ?
                        ($user->kupunesia_email_verified_at ? true : false) : null
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to resend verification:', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'SERVER_ERROR',
                'message' => 'Gagal mengirim ulang email verifikasi'
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            $token = $request->header('Authorization');
        
            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token not found'
                ], 401);
            }

            // Clean token string
            $token = str_replace('Bearer ', '', $token);

            try {
                // Validate token first
                $user = JWTAuth::setToken($token)->authenticate();
            
                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User not found'
                    ], 404);
                }

                // Invalidate token
                JWTAuth::invalidate(true);

                // Clear any user sessions if exists
                if (session()->has('user_id')) {
                    session()->forget('user_id');
                    session()->flush();
                }

                // Log the logout
                \Log::info('User logged out successfully', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'timestamp' => now()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Successfully logged out'
                ], 200);

            } catch (TokenExpiredException $e) {
                // If token already expired, still return success
                return response()->json([
                    'success' => true,
                    'message' => 'Token already expired, logged out successfully'
                ], 200);

            } catch (TokenInvalidException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token'
                ], 401);
            }

        } catch (JWTException $e) {
            \Log::error('Logout error:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not process logout'
            ], 500);
        }
    }

    public function getUser($id)
    {
        $user = FobiUser::find($id);
        if (!$user) {
            return response()->json(['error' => 'Pengguna tidak ditemukan'], 404);
        }
        return response()->json($user);
    }
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        try {
            $user = FobiUser::where('email', $request->email)->first();

            if (!$user) {
                return response()->json([
                    'error' => 'USER_NOT_FOUND',
                    'message' => 'Email tidak ditemukan'
                ], 404);
            }

            // Generate reset token tanpa hashing
            $token = Str::random(60);

            // Simpan token tanpa hashing
            DB::table('password_resets')->updateOrInsert(
                ['email' => $user->email],
                [
                    'token' => $token, // Simpan token asli
                    'created_at' => now()
                ]
            );

            // Kirim email reset password
            Mail::to($user->email)->send(new ResetPassword($user, $token));

            return response()->json([
                'message' => 'Link reset password telah dikirim ke email Anda'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'SERVER_ERROR',
                'message' => 'Gagal mengirim email reset password'
            ], 500);
        }
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:6|confirmed'
        ]);

        try {
            $passwordReset = DB::table('password_resets')
                ->where('email', $request->email)
                ->where('token', $request->token) // Bandingkan token langsung
                ->first();

            if (!$passwordReset) {
                return response()->json([
                    'error' => 'INVALID_TOKEN',
                    'message' => 'Token tidak valid atau sudah kadaluarsa'
                ], 400);
            }

            // Cek apakah token masih valid (24 jam)
            if (Carbon::parse($passwordReset->created_at)->addHours(24)->isPast()) {
                return response()->json([
                    'error' => 'TOKEN_EXPIRED',
                    'message' => 'Token sudah kadaluarsa'
                ], 400);
            }

            $user = FobiUser::where('email', $request->email)->first();
            $user->password = Hash::make($request->password);
            $user->save();

            // Hapus token reset password
            DB::table('password_resets')->where('email', $request->email)->delete();

            return response()->json([
                'message' => 'Password berhasil direset'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'SERVER_ERROR',
                'message' => 'Gagal mereset password'
            ], 500);
        }
    }
    public function getUserProfile($id)
    {
        try {
            // Debug log
            \Log::info('Fetching user profile for ID: ' . $id);

            // Validasi ID
            if (!is_numeric($id)) {
                return response()->json([
                    'success' => false,
                    'error' => 'INVALID_ID',
                    'message' => 'ID pengguna tidak valid'
                ], 400);
            }

            $user = FobiUser::select(
                'id',
                'fname',
                'lname',
                'uname',
                'email',
                'phone',
                'organization',
                'bio',
                'profile_picture',
                'created_at'
            )->where('id', $id)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'USER_NOT_FOUND',
                    'message' => 'Pengguna tidak ditemukan'
                ], 404);
            }

            // Hitung total observasi dari semua tabel
            $totalFobiObservations = DB::table('fobi_checklist_taxas')
                ->where('user_id', $id)
                ->count();

            $totalBirdObservations = DB::table('fobi_checklists')
                ->where('fobi_user_id', $id)
                ->count();

            $totalButterflyObservations = DB::table('fobi_checklists_kupnes')
                ->where('fobi_user_id', $id)
                ->count();

            // Debug log
            \Log::info('User data retrieved:', [
                'user_id' => $id,
                'fobi_obs' => $totalFobiObservations,
                'bird_obs' => $totalBirdObservations,
                'butterfly_obs' => $totalButterflyObservations
            ]);

            return response()->json([
                'success' => true,
                'data' => array_merge(
                    $user->toArray(),
                    [
                        'totalObservations' => $totalFobiObservations + $totalBirdObservations + $totalButterflyObservations,
                        'totalFobiObservations' => $totalFobiObservations,
                        'totalBirdObservations' => $totalBirdObservations,
                        'totalButterflyObservations' => $totalButterflyObservations
                    ]
                )
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getUserProfile:', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'USER_NOT_FOUND',
                'message' => 'Pengguna tidak ditemukan'
            ], 404);
        }
    }
    public function checkTokenStatus(Request $request)
    {
        try {
            $token = str_replace('Bearer ', '', $request->header('Authorization'));
        
            if (!$token) {
                return response()->json([
                    'valid' => false,
                    'message' => 'No token provided'
                ]);
            }

            $user = JWTAuth::setToken($token)->authenticate();
        
            return response()->json([
                'valid' => true,
                'user' => $user
            ]);

        } catch (TokenExpiredException $e) {
            return response()->json([
                'valid' => false,
                'message' => 'Token has expired'
            ], 401);
        } catch (JWTException $e) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid token'
            ], 401);
        }
    }
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login', 'register', 'forgotPassword', 'resetPassword']]);
        
        // Add custom middleware to handle token expiration
        $this->middleware(function ($request, $next) {
            try {
                if ($token = JWTAuth::parseToken()) {
                    try {
                        if (!JWTAuth::authenticate($token)) {
                            return response()->json([
                                'success' => false,
                                'message' => 'User not found'
                            ], 404);
                        }
                    } catch (TokenExpiredException $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Token has expired',
                            'code' => 'TOKEN_EXPIRED'
                        ], 401);
                    } catch (TokenInvalidException $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Token is invalid',
                            'code' => 'TOKEN_INVALID'
                        ], 401);
                    }
                }
                return $next($request);
            } catch (JWTException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token is required'
                ], 401);
            }
        })->only(['logout', 'getUser', 'getUserProfile']);
    }
}