import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { id } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faChartLine } from '@fortawesome/free-solid-svg-icons';

function ActivityChart({ data, period = 'year' }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [loading, setLoading] = useState(true);
    const [isEmpty, setIsEmpty] = useState(false);

    useEffect(() => {
        setLoading(true);
        
        // Periksa apakah data kosong atau tidak ada aktivitas
        const hasData = data && data.length > 0 && data.some(item => 
            (item.sources?.fobi > 0 || item.sources?.bird > 0 || 
             item.sources?.butterfly > 0 || item.sources?.identification > 0)
        );
        
        setIsEmpty(!hasData);
        
        if (!hasData) {
            setLoading(false);
            return;
        }

        setTimeout(() => {
            if (chartRef.current) {
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
                        borderColor: '#f5429e',
                        backgroundColor: '#f5429e',
                        borderWidth: 2,
                        tension: 0,
                        pointRadius: 4,
                        pointBackgroundColor: '#FFFFFF',
                        pointBorderColor: '#f5429e',
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
                    },
                    {
                        label: 'Identifikasi',
                        data: data
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map(item => ({
                                x: new Date(item.date),
                                y: item.sources?.identification || 0
                            })),
                        borderColor: '#9bf542',
                        backgroundColor: '#9bf542',
                        borderWidth: 2,
                        tension: 0,
                        pointRadius: 4,
                        pointBackgroundColor: '#FFFFFF',
                        pointBorderColor: '#9bf542',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6,
                        fill: false
                    }
                ];

                // Sesuaikan unit dan format tampilan berdasarkan periode
                const timeUnit = period === 'year' ? 'month' : 
                                period === 'month' ? 'day' : 
                                period === 'week' ? 'day' : 'month';
                                
                const displayFormats = {
                    month: 'MMM yyyy',
                    day: 'd MMM'
                };

                // Sesuaikan stepSize untuk sumbu Y berdasarkan data
                const maxValue = Math.max(
                    ...datasets.flatMap(dataset => dataset.data.map(item => item.y))
                );
                
                const stepSize = maxValue <= 5 ? 1 : 
                                maxValue <= 20 ? 2 : 
                                maxValue <= 50 ? 5 : 10;

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
                                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                                titleColor: '#e0e0e0',
                                bodyColor: '#e0e0e0',
                                borderColor: '#444',
                                borderWidth: 1,
                                padding: 10,
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
                                    color: '#e0e0e0',
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
                                    unit: timeUnit,
                                    displayFormats: displayFormats,
                                    tooltipFormat: 'd MMMM yyyy'
                                },
                                adapters: {
                                    date: {
                                        locale: id
                                    }
                                },
                                grid: {
                                    display: false,
                                    color: '#333'
                                },
                                border: {
                                    display: true,
                                    color: '#444'
                                },
                                ticks: {
                                    color: '#aaa',
                                    font: {
                                        size: 10
                                    },
                                    maxRotation: 45,
                                    minRotation: 0
                                }
                            },
                            y: {
                                beginAtZero: true,
                                border: {
                                    display: true,
                                    color: '#444'
                                },
                                grid: {
                                    color: '#333',
                                    drawBorder: false
                                },
                                ticks: {
                                    stepSize: stepSize,
                                    color: '#aaa',
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
                        },
                        animation: {
                            onComplete: () => {
                                setLoading(false);
                            }
                        }
                    }
                });
            }
        }, 300);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, period]);

    if (isEmpty) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <FontAwesomeIcon icon={faChartLine} className="text-3xl mb-3 opacity-50" />
                <p>Belum ada aktivitas untuk periode {
                    period === 'year' ? 'tahun ini' : 
                    period === 'month' ? 'bulan ini' : 
                    period === 'week' ? 'minggu ini' : ''
                }</p>
            </div>
        );
    }

    return (
        <div className="h-64 relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] bg-opacity-70 z-10">
                    <div className="flex flex-col items-center">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-[#1a73e8] text-2xl mb-2" />
                        <span className="text-sm text-[#e0e0e0]">Memuat data...</span>
                    </div>
                </div>
            )}
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

export default ActivityChart;
