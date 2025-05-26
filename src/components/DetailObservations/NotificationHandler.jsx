import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import Pusher from 'pusher-js';

function NotificationHandler({ checklistId }) {
    useEffect(() => {
        // Inisialisasi Pusher
        const pusher = new Pusher('2d50c7dd083d072bcc27', {
            cluster: 'ap1'
        });

        // Subscribe ke channel
        const channel = pusher.subscribe(`checklist.${checklistId}`);

        // Event handlers
        channel.bind('QualityAssessmentUpdated', (data) => {
            const gradeMessages = {
                'research grade': 'Observasi telah mencapai ID Lengkap!',
                'needs ID': 'Observasi membutuhkan identifikasi tambahan',
                'ID kurang': 'Observasi hanya memiliki 1 konfirmasi',
                'casual': 'Observasi berstatus casual'
            };

            toast.info(gradeMessages[data.grade] || 'Status kualitas telah diperbarui');
        });

        channel.bind('IdentificationAdded', (data) => {
            toast.success(`Identifikasi baru ditambahkan oleh ${data.identifier_name}`);
        });

        channel.bind('CuratorVerified', (data) => {
            toast.success('Observasi telah diverifikasi oleh Kurator');
        });

        // Cleanup
        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`checklist.${checklistId}`);
        };
    }, [checklistId]);

    return null; // Komponen ini tidak merender apapun
}

export default NotificationHandler;
