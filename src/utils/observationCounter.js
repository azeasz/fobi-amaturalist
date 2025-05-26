// utils/observationCounter.js
export const ObservationCounter = {
    get: () => {
        return parseInt(localStorage.getItem('totalObservations')) || 0;
    },
    
    set: (value) => {
        if (typeof value === 'number' && value >= 0) {
            localStorage.setItem('totalObservations', value.toString());
        }
    },
    
    increment: (amount = 1) => {
        const current = ObservationCounter.get();
        ObservationCounter.set(current + amount);
        return current + amount;
    },

    sync: async (userId, token) => {
        try {
            const response = await apiFetch(`/user/${userId}/total-observations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Sync failed');
            
            const data = await response.json();
            if (data.success && typeof data.total === 'number') {
                ObservationCounter.set(data.total);
                return data.total;
            }
            throw new Error('Invalid response data');
        } catch (error) {
            console.error('Sync error:', error);
            return ObservationCounter.get(); // fallback to local value
        }
    }
};
