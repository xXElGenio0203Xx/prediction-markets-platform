
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Shield, 
  Lightbulb,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  Target,
  Trophy
} from "lucide-react";
import { motion } from "framer-motion";

export default function LearnMorePage() {
  const howItWorksSteps = [
    {
      number: 1,
      title: "Make a Prediction",
      description: "Browse active markets about Brown campus events, weather, academics, and more. Choose a question that interests you.",
      icon: Target,
      color: "from-blue-500 to-indigo-500",
      illustration: "🎯"
    },
    {
      number: 2,
      title: "Trade YES/NO Shares",
      description: "Buy or sell shares based on your prediction. Prices reflect market confidence. Set your own limit prices or take existing orders.",
      icon: TrendingUp,
      color: "from-purple-500 to-pink-500",
      illustration: "📈"
    },
    {
      number: 3,
      title: "Track Your Profits",
      description: "Watch your portfolio grow as events unfold. Compete on the leaderboard and earn Bruno Dollars as markets resolve in your favor!",
      icon: Trophy,
      color: "from-orange-500 to-red-500",
      illustration: "🏆"
    }
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#A97142] to-[#CD853F] rounded-full flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-[#4E3629] mb-4">How Bruno Exchange Works</h1>
          <p className="text-xl text-[#4E3629]/70 max-w-2xl mx-auto">
            Learn how to navigate Brown's prediction market platform and make informed trades on campus events.
          </p>
        </motion.div>

        {/* How It Works - 3 Step Process */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#4E3629] mb-8 text-center">Three Simple Steps</h2>
          <div className="space-y-8">
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      {/* Number & Illustration */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className={`w-24 h-24 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                            <span className="text-5xl">{step.illustration}</span>
                          </div>
                          <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#4E3629] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {step.number}
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-[#4E3629] mb-3">{step.title}</h3>
                        <p className="text-[#4E3629]/70 leading-relaxed text-lg">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="font-semibold text-[#4E3629] mb-2">Browse Markets</h3>
                <p className="text-sm text-[#4E3629]/70">Explore active prediction markets about Brown campus events, weather, and academics.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="font-semibold text-[#4E3629] mb-2">Place Orders</h3>
                <p className="text-sm text-[#4E3629]/70">Buy YES or NO shares based on your prediction. Set your price and quantity.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="font-semibold text-[#4E3629] mb-2">Track Portfolio</h3>
                <p className="text-sm text-[#4E3629]/70">Monitor your positions and P&L as events unfold and markets resolve.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Hours */}
        <Card className="mb-12 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="w-6 h-6 text-amber-600" />
              Exchange Trading Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-5 border border-blue-200">
                <h3 className="font-bold text-lg text-blue-600 mb-2">Auction Period</h3>
                <p className="text-3xl font-extrabold text-[#4E3629] mb-2">9:00 AM - 12:00 PM</p>
                <p className="text-sm text-[#4E3629]/70">
                  Opening auction period where traders place initial orders. Orders are collected and matched at the end of the auction.
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-5 border border-green-200">
                <h3 className="font-bold text-lg text-green-600 mb-2">Live Exchange</h3>
                <p className="text-3xl font-extrabold text-[#4E3629] mb-2">12:15 PM - 5:00 PM</p>
                <p className="text-sm text-[#4E3629]/70">
                  Continuous trading period with real-time order matching. Place and execute trades instantly during active market hours.
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-300">
              <p className="text-sm text-amber-800 font-medium">
                <Info className="w-4 h-4 inline mr-2" />
                All times are in Eastern Time (ET). Trading is only available during these hours on business days.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What are Prediction Markets */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                What are Prediction Markets?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#4E3629]/70">
                Prediction markets allow you to trade on the outcome of future events. Prices reflect the collective wisdom of all traders.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-sm text-[#4E3629]/70">Prices between $0.01 and $0.99</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-sm text-[#4E3629]/70">Higher prices = higher probability</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-sm text-[#4E3629]/70">Markets resolve YES or NO</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                How Trading Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#4E3629]/70">
                Place limit orders to buy or sell shares. Your orders are matched with other traders automatically.
              </p>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-2">Example:</h4>
                <p className="text-sm text-amber-700">
                  If you buy 100 YES shares at $0.60, you profit $40 if the event happens (100 × $1.00 - $60 cost).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Features */}
        <Card className="mb-12 bg-white/80 backdrop-blur-sm border border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-6 h-6 text-amber-600" />
              Platform Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-[#4E3629] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  Brown Students Only
                </h3>
                <p className="text-[#4E3629]/70">Exclusive access for Brown University students with @brown.edu emails.</p>
                
                <h3 className="font-semibold text-[#4E3629] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Real-time Order Book
                </h3>
                <p className="text-[#4E3629]/70">See live buy and sell orders, track market movements in real-time.</p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-[#4E3629] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  Portfolio Tracking
                </h3>
                <p className="text-[#4E3629]/70">Monitor your positions, P&L, and trading performance across all markets.</p>
                
                <h3 className="font-semibold text-[#4E3629] flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />
                  Leaderboard
                </h3>
                <p className="text-[#4E3629]/70">Compete with other Brown students and see who's the best predictor.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="mb-12 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[#4E3629]">Educational Use Only</h4>
                <p className="text-[#4E3629]/70">All trading is done with virtual Bruno Dollars. No real money involved.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[#4E3629]">Limit Orders Only</h4>
                <p className="text-[#4E3629]/70">All orders are limit orders - you set the exact price you're willing to trade at.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[#4E3629]">Market Resolution</h4>
                <p className="text-[#4E3629]/70">Markets resolve based on verifiable outcomes. Check resolution criteria before trading.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Started */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#4E3629] mb-4">Ready to Start Trading?</h2>
          <p className="text-[#4E3629]/70 mb-8">Browse active markets and make your first prediction on Brown campus events.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl("Markets")}>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-[#A97142] to-[#CD853F] hover:from-[#8B5A3C] hover:to-[#A97142] text-white shadow-lg"
              >
                Browse Markets
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to={createPageUrl("RequestMarket")}>
              <Button size="lg" variant="outline" className="border-[#A97142] text-[#A97142] hover:bg-[#A97142]/10">
                Request a Market
              </Button>
            </Link>
          </div>
        </div>

        {/* Hidden Admin Access - Small button at bottom */}
        <div className="mt-24 flex justify-center">
          <Link to={createPageUrl("Admin")}>
            <button className="text-[#4E3629]/20 hover:text-[#4E3629]/40 transition-colors text-xs">
              •
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
