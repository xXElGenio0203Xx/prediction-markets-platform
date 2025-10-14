
import React, { useState } from "react";
import { MarketRequest } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RequestMarketPage({ user }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    resolution_criteria: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      if (!formData.title || !formData.resolution_criteria) {
          setError("Market Question and Resolution Criteria are required.");
          setIsSubmitting(false);
          return;
      }
        
      await MarketRequest.create({
        ...formData,
        requester_email: user?.email || "anonymous",
        status: "pending"
      });
      
      setSuccess(true);
      setFormData({
          title: "",
          description: "",
          category: "",
          resolution_criteria: "",
      });

    } catch (err) {
      console.error("Error submitting market request:", err);
      setError("An unexpected error occurred. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-12">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Markets"))}
            className="border-amber-200 hover:bg-amber-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Request a Market</h1>
            <p className="text-lg text-gray-600">Have an idea for a prediction market? Let us know!</p>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border border-amber-200">
          <CardHeader>
            <CardTitle className="text-xl">Your Market Idea</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
                <p className="text-gray-600 mb-6">Thank you! Your market idea has been sent for review.</p>
                <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setSuccess(false)}>Submit Another</Button>
                    <Button onClick={() => navigate(createPageUrl("Markets"))} className="bg-gradient-to-r from-amber-600 to-red-600">Back to Markets</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Market Question</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Will it snow on campus this week?"
                    required
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Provide more details about your market idea."
                    rows={3}
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criteria">Resolution Criteria</Label>
                  <Textarea
                    id="criteria"
                    value={formData.resolution_criteria}
                    onChange={(e) => handleInputChange('resolution_criteria', e.target.value)}
                    placeholder="How should this market be resolved? Be specific about the data source (e.g., a specific website, official announcement)."
                    rows={3}
                    required
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="category">Category (optional)</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="border-amber-200 focus:border-amber-400">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academics">Academics</SelectItem>
                        <SelectItem value="weather">Weather</SelectItem>
                        <SelectItem value="campus_politics">Campus Politics</SelectItem>
                        <SelectItem value="commencement">Commencement</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-amber-100">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 w-full sm:w-auto"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
