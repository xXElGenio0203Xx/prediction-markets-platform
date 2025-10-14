import Layout from "./Layout.jsx";

import Markets from "./Markets";

import Portfolio from "./Portfolio";

import Leaderboard from "./Leaderboard";

import Market from "./Market";

import RequestMarket from "./RequestMarket";

import LearnMore from "./LearnMore";

import LiveAuction from "./LiveAuction";

import AllMarkets from "./AllMarkets";

import Admin from "./Admin";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Markets: Markets,
    
    Portfolio: Portfolio,
    
    Leaderboard: Leaderboard,
    
    Market: Market,
    
    RequestMarket: RequestMarket,
    
    LearnMore: LearnMore,
    
    LiveAuction: LiveAuction,
    
    AllMarkets: AllMarkets,
    
    Admin: Admin,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Markets />} />
                
                
                <Route path="/Markets" element={<Markets />} />
                
                <Route path="/Portfolio" element={<Portfolio />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Market" element={<Market />} />
                
                <Route path="/RequestMarket" element={<RequestMarket />} />
                
                <Route path="/LearnMore" element={<LearnMore />} />
                
                <Route path="/LiveAuction" element={<LiveAuction />} />
                
                <Route path="/AllMarkets" element={<AllMarkets />} />
                
                <Route path="/Admin" element={<Admin />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}