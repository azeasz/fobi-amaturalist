import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../utils/api';

const NotificationPage = () => {
    const navigate = useNavigate();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiFetch('/notifications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            return data.success ? data.data : [];
        },
        enabled: !!localStorage.getItem('jwt_token'),
        refetchInterval: 30000
    });

    const handleMarkAsRead = async (notificationId) => {
        try {
            await apiFetch(`/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl mt-10">
            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex items-center">
                    <FontAwesomeIcon icon={faBell} className="text-[#679995] text-xl mr-3" />
                    <h1 className="text-2xl font-medium">Notifikasi</h1>
                </div>

                <div className="divide-y">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            Memuat notifikasi...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Tidak ada notifikasi
                        </div>
                    ) : (
                        notifications.map(notification => {
                            const { date, time } = formatDateTime(notification.created_at);
                            return (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                    onClick={() => {
                                        handleMarkAsRead(notification.id);
                                        navigate(`/observations/${notification.checklist_id}`);
                                    }}
                                >
                                    <p className="text-base text-gray-800 mb-2">{notification.message}</p>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <span>{date}</span>
                                        <span className="mx-1">•</span>
                                        <span>{time}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPage;
