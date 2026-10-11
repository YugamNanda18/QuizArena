import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getSocket } from '../services/socket';
import { X, Copy, Check, Radio, Share2, Send, QrCode, MessageSquare, Mail } from 'lucide-react';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  roomCode: string;
  title: string;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  isOpen,
  onClose,
  quizId,
  roomCode,
  title,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const shareUrl = `${window.location.origin}/?room=${roomCode}`;

  useEffect(() => {
    if (isOpen && roomCode) {
      QRCode.toDataURL(shareUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [isOpen, roomCode, shareUrl]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBroadcast = () => {
    try {
      const socket = getSocket();
      socket.emit('room:broadcast', {
        roomCode,
        title,
        quizId,
      });
      setBroadcastSent(true);
      setTimeout(() => setBroadcastSent(false), 3000);
    } catch (err) {
      console.error('Failed to broadcast room:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Join Live Assessment "${title}" on QuizArena!\n\nRoom Code: ${roomCode}\nDirect Link: ${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Assessment Invitation: ${title} (Room: ${roomCode})`);
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited to participate in the assessment "${title}".\n\nRoom Code: ${roomCode}\nDirect Access Link: ${shareUrl}\n\nPlease join the waiting room prior to start time.\n\nBest regards,\nProctor Team`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="max-w-lg w-full rounded-3xl p-6 sm:p-8 border shadow-2xl relative space-y-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl border opacity-60 hover:opacity-100 transition-opacity"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1 pr-6">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Real-Time Candidate Dispatch</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
            Share Room Code & Live Link
          </h2>
          <p className="text-xs opacity-70" style={{ color: 'var(--text-muted)' }}>
            {title}
          </p>
        </div>

        {/* Large Prominent Room Code Badge */}
        <div
          className="p-4 rounded-2xl border text-center relative overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--accent-color)',
            boxShadow: 'var(--glow-shadow)',
          }}
        >
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block" style={{ color: 'var(--text-muted)' }}>
            Assessment Room Code
          </span>
          <div className="flex items-center justify-center space-x-3 mt-1">
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest" style={{ color: 'var(--accent-color)' }}>
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl text-xs font-bold border transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="Copy Room Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Real-Time Live WebSocket Broadcast Button */}
        <div className="space-y-2">
          <button
            onClick={handleBroadcast}
            disabled={broadcastSent}
            className="w-full py-3 px-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-75"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
              boxShadow: '0 4px 20px -2px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Radio className={`w-4 h-4 ${broadcastSent ? 'animate-spin' : 'animate-ping'}`} />
            <span>
              {broadcastSent
                ? 'Broadcasted Live to All Students!'
                : 'Broadcast Room Code to All Connected Candidates'}
            </span>
          </button>
          <p className="text-[11px] text-center opacity-60" style={{ color: 'var(--text-muted)' }}>
            Sends instant WebSocket notification to any candidate currently viewing the portal.
          </p>
        </div>

        {/* Direct Link & QR Code Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Direct Link Card */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold block mb-1 opacity-75" style={{ color: 'var(--text-main)' }}>
                Direct Assessment URL
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full text-xs font-mono rounded-xl p-2.5 border focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-xl border flex-shrink-0 transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                  title="Copy Direct Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={handleWhatsAppShare}
                className="flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-400"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleEmailShare}
                className="flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors hover:bg-sky-500/10 hover:border-sky-500/40 text-sky-400"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
            </div>
          </div>

          {/* QR Code Container */}
          <div
            className="p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center space-y-1.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code to join room ${roomCode}`}
                className="w-28 h-28 rounded-xl shadow-md border"
                style={{ borderColor: 'var(--border-subtle)' }}
              />
            ) : (
              <div className="w-28 h-28 rounded-xl border flex items-center justify-center opacity-40">
                <QrCode className="w-10 h-10" />
              </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted)' }}>
              Scan to Join on Mobile
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
