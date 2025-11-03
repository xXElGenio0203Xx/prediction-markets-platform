import Layout from "./Layout.jsx";

import Markets from "./Markets";

import Portfolio from "./Portfolio";

import Leaderboard from "./Leaderboard";

import Market from "./Market";

import RequestMarket from "./RequestMarket";

import LearnMore from "./LearnMore";

import AllMarkets from "./AllMarkets";

import Admin from "./Admin";

import PortfolioAnalytics from "./PortfolioAnalytics";

import MarketAnalytics from "./MarketAnalytics";

import TradeHistory from "./TradeHistory";

import PlatformMetrics from "./PlatformMetrics";

import Login from "./Login";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Markets: Markets,
    
    Portfolio: Portfolio,
    
    Leaderboard: Leaderboard,
    
    Market: Market,
    
    RequestMarket: RequestMarket,
    
    LearnMore: LearnMore,
    
    AllMarkets: AllMarkets,
    
    Admin: Admin,
    
    PortfolioAnalytics: PortfolioAnalytics,
    
    MarketAnalytics: MarketAnalytics,
    
    TradeHistory: TradeHistory,
    
    PlatformMetrics: PlatformMetrics,
    
    Login: Login,
    
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
    
    // Login page doesn't need the Layout wrapper
    if (location.pathname.toLowerCase() === '/login') {
        return (
            <Routes>
                <Route path="/Login" element={<Login />} />
            </Routes>
        );
    }
    
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
                
                <Route path="/AllMarkets" element={<AllMarkets />} />
                
                <Route path="/Admin" element={<Admin />} />
                
                <Route path="/PortfolioAnalytics" element={<PortfolioAnalytics />} />
                
                <Route path="/MarketAnalytics/:slug" element={<MarketAnalytics />} />
                
                <Route path="/TradeHistory" element={<TradeHistory />} />
                
                <Route path="/PlatformMetrics" element={<PlatformMetrics />} />
                
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