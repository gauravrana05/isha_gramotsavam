'use client';

import { useState } from 'react';
import Image from 'next/image';

type Tab = 'Finals' | 'Division' | 'Cluster';

const prizeImages: Record<Tab, string> = {
    Finals: '/images/sports/finals_prizes.png',
    Division: '/images/sports/division_prizes.png',
    Cluster: '/images/sports/cluster_prizes.png',
};

const PrizeDisplay = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Finals');

    return (
        <div className="max-w-3xl mx-auto">
            {/* Tabs */}
            <div className="flex justify-center mb-12">
                <div className="bg-gray-100 rounded-lg p-1 flex flex-wrap gap-1">
                    {(['Finals', 'Division', 'Cluster'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 sm:px-6 py-2 rounded-md font-semibold text-sm sm:text-base transition-colors font-fira ${
                                activeTab === tab
                                    ? 'bg-[#F28C38] text-white shadow-md'
                                    : 'text-[#4A2F1D] hover:bg-orange-200 hover:text-[#F28C38]'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Prize Image */}
            <div className="mt-8 relative w-full h-auto">
                 <Image
                    src={prizeImages[activeTab]}
                    alt={`${activeTab} prizes`}
                    width={800}
                    height={550}
                    className="mx-auto"
                    key={activeTab}
                 />
            </div>
        </div>
    );
};

export default PrizeDisplay;
