import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { id } from 'date-fns/locale';

function ActivityChart({ data }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');

        // Persiapkan data untuk setiap sumber
        const datasets = [
            {
                label: 'FOBI',
                data: data
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(item => ({
                        x: new Date(item.date),
                        y: item.sources?.fobi || 0
                    })),
                borderColor: '#3B82F6',
                backgroundColor: '#3B82F6',
                borderWidth: 2,
                tension: 0,
                pointRadius: 4,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#3B82F6',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                fill: false
            },
            {
                label: 'Burungnesia',
                data: data
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(item => ({
                        x: new Date(item.date),
                        y: item.sources?.bird || 0
                    })),
                borderColor: '#F59E0B',
                backgroundColor: '#F59E0B',
                borderWidth: 2,
                tension: 0,
                pointRadius: 4,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#F59E0B',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                fill: false
            },
            {
                label: 'Kupunesia',
                data: data
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(item => ({
                        x: new Date(item.date),
                        y: item.sources?.butterfly || 0
                    })),
                borderColor: '#10B981',
                backgroundColor: '#10B981',
                borderWidth: 2,
                tension: 0,
                pointRadius: 4,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#10B981',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                fill: false
            },
            {
                label: 'Identifikasi',
                data: data
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(item => ({
                        x: new Date(item.date),
                        y: item.sources?.identification || 0
                    })),
                borderColor: '#8B5CF6',
                backgroundColor: '#8B5CF6',
                borderWidth: 2,
                tension: 0,
                pointRadius: 4,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#8B5CF6',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                fill: false
            }
        ];

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#1F2937',
                        bodyColor: '#1F2937',
                        borderColor: '#E5E7EB',
                        borderWidth: 1,
                        padding: 8,
                        callbacks: {
                            title: (context) => {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                });
                            },
                            label: (context) => {
                                return `${context.dataset.label}: ${context.parsed.y} observasi`;
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'start',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        adapters: {
                            date: {
                                locale: id
                            }
                        },
                        grid: {
                            display: false
                        },
                        border: {
                            display: true
                        },
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        border: {
                            display: true
                        },
                        grid: {
                            color: '#E5E7EB',
                            drawBorder: false
                        },
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 15,
                        bottom: 10,
                        left: 10
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    return (
        <div className="h-64 relative">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

export default ActivityChart;
