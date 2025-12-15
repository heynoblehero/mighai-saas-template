import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';

export default function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        setError('Failed to fetch campaigns');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestOTPForAction = async (action, campaignId = null) => {
    try {
      const response = await fetch('/api/auth/send-campaign-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, campaignId }),
      });

      if (response.ok) {
        setSelectedCampaign({ action, campaignId });
        setShowOTPModal(true);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    }
  };

  const verifyOTPAndExecute = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/verify-campaign-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: otpCode,
          action: selectedCampaign.action,
          campaignId: selectedCampaign.campaignId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowOTPModal(false);
        setOtpCode('');
        
        // Execute the action
        if (selectedCampaign.action === 'create') {
          router.push('/admin/campaigns/new');
        } else if (selectedCampaign.action === 'send') {
          await sendCampaign(selectedCampaign.campaignId);
        } else if (selectedCampaign.action === 'newsletter') {
          router.push('/admin/campaigns/newsletter');
        }
        
        await fetchCampaigns(); // Refresh list
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const sendCampaign = async (campaignId) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        setError('Campaign sent successfully!');
        setTimeout(() => setError(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send campaign');
      }
    } catch (err) {
      setError('Failed to send campaign');
    }
  };

  const toggleCampaign = async (campaignId, isActive) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        await fetchCampaigns();
      } else {
        setError('Failed to update campaign status');
      }
    } catch (err) {
      setError('Failed to update campaign status');
    }
  };

  const getCampaignTypeColor = (type) => {
    switch (type) {
      case 'welcome': return 'bg-green-100 text-green-800';
      case 'onboarding': return 'bg-blue-100 text-blue-800';
      case 'newsletter': return 'bg-purple-100 text-purple-800';
      case 'marketing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Email Campaigns">
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="text-subdued">Loading campaigns...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Email Campaigns">
      <div className="shopify-dashboard">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="text-display-medium">Email Campaigns</h1>
              <p className="text-subdued">Create and manage automated email sequences</p>
            </div>
            <div className="header-actions">
              <button
                onClick={() => requestOTPForAction('newsletter')}
                className="btn btn-secondary btn-sm"
              >
                Send Newsletter
              </button>
              <button
                onClick={() => requestOTPForAction('create')}
                className="btn btn-primary btn-sm"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className={`alert ${error.includes('successfully') ? 'alert-success' : 'alert-critical'} mx-8 mb-6`}>
            <div className="alert-content">
              <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                {error.includes('successfully') ? (
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                )}
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        <div className="stats-overview">
          {campaigns.length > 0 ? (
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Active Campaigns</h3>
              </div>
              <div className="chart-container">
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 bg-surface-neutral rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-body font-semibold">{campaign.name}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getCampaignTypeColor(campaign.type)}`}>
                            {campaign.type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {campaign.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-subdued text-sm">{campaign.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-subdued">
                          <span>Target: {campaign.target_plan}</span>
                          <span>Delay: {campaign.send_delay_hours}h</span>
                          <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCampaign(campaign.id, campaign.is_active)}
                          className={`btn btn-sm ${campaign.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        >
                          {campaign.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => requestOTPForAction('send', campaign.id)}
                          className="btn btn-primary btn-sm"
                          disabled={!campaign.is_active}
                        >
                          Send Now
                        </button>
                        <button
                          onClick={() => router.push(`/admin/campaigns/${campaign.id}/edit`)}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="chart-card">
              <div className="chart-container text-center py-12">
                <svg className="w-16 h-16 text-subdued mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-heading mb-2">No campaigns yet</h3>
                <p className="text-subdued mb-6">Create your first email campaign to engage with your customers</p>
                <button
                  onClick={() => requestOTPForAction('create')}
                  className="btn btn-primary"
                >
                  Create Your First Campaign
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface p-6 rounded-lg border border-border max-w-md w-full mx-4">
            <h3 className="text-heading mb-4">Admin Verification Required</h3>
            <p className="text-subdued mb-4">
              Please enter the OTP sent to your admin email to continue with this action.
            </p>
            <div className="form-group mb-6">
              <label htmlFor="otp" className="form-label">Verification Code</label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="form-input"
                placeholder="Enter 6-digit code"
                maxLength="6"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setOtpCode('');
                  setError('');
                }}
                className="btn btn-secondary flex-1"
                disabled={otpLoading}
              >
                Cancel
              </button>
              <button
                onClick={verifyOTPAndExecute}
                className={`btn btn-primary flex-1 ${otpLoading ? 'btn-loading' : ''}`}
                disabled={otpLoading || otpCode.length !== 6}
              >
                {otpLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}