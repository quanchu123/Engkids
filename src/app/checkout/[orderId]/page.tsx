'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Copy, ArrowRight, Clock, Building2, CreditCard, QrCode, Loader2 } from 'lucide-react';
import { BANK_CONFIG, buildVietQrUrl, SUBSCRIPTION_PLANS, PlanId } from '@/lib/payment';
import { clearPremiumCache } from '@/lib/freemium';
import Link from 'next/link';
import Image from 'next/image';

interface TransactionData {
  order_code: string;
  amount: number;
  plan_id: string;
  status: string;
  paid_at: string | null;
}

export default function CheckoutPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnedFromPayos = searchParams.get('success') === 'true';
  const orderCode = params.orderId;

  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [isPaid, setIsPaid] = useState(returnedFromPayos);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pollingError, setPollingError] = useState(false);
  const [redirectCount, setRedirectCount] = useState(5);

  // Fetch transaction status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment/status?orderCode=${orderCode}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.transaction) {
        setTransaction(data.transaction);
        if (data.transaction.status === 'PAID') {
          setIsPaid(true);
          setIsConfirmed(true);
          clearPremiumCache();
        }
      }
    } catch {
      setPollingError(true);
    }
  }, [orderCode]);

  // Initial fetch
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Poll status while not confirmed in DB (especially important if redirected with success=true before webhook finishes)
  useEffect(() => {
    if (isConfirmed) return;
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [isConfirmed, checkStatus]);

  // Auto redirect after payment success and DB confirmation
  useEffect(() => {
    if (!isConfirmed) return;
    const timer = setInterval(() => {
      setRedirectCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isConfirmed, router]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const amount = transaction?.amount || 0;
  const planId = transaction?.plan_id as PlanId | undefined;
  const plan = planId ? SUBSCRIPTION_PLANS[planId] : null;
  const qrUrl = buildVietQrUrl(amount, orderCode);

  // ─── Success screen ──────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 p-8 md:p-12 rounded-3xl max-w-lg w-full text-center shadow-2xl">
          <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Thanh toán thành công!</h1>
          <p className="text-gray-400 mb-2 text-lg">
            Tài khoản của bạn đã được nâng cấp lên <strong className="text-purple-400">Premium</strong>.
          </p>
          {plan && (
            <p className="text-gray-500 text-sm mb-6">
              {plan.name} – {plan.price.toLocaleString('vi-VN')}đ
            </p>
          )}
          {isConfirmed ? (
            <p className="text-sm text-gray-600 mb-8">
              Tự động chuyển về trang chủ sau {redirectCount} giây...
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
              <Loader2 size={16} className="animate-spin text-purple-400" />
              <span>Đang hoàn tất kích hoạt Premium...</span>
            </div>
          )}
          <Link
            href="/"
            onClick={() => clearPremiumCache()}
            className="inline-flex items-center justify-center w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg gap-2"
          >
            Bắt đầu học ngay <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Checkout / QR screen ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 py-8 md:py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Thanh toán chuyển khoản</h1>
          <p className="text-gray-400">
            {returnedFromPayos
              ? 'Đang xác nhận thanh toán với hệ thống...'
              : 'Quét mã QR hoặc chuyển khoản theo thông tin bên dưới'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 text-purple-400">
              <QrCode size={20} />
              <span className="font-semibold">Mã QR VietQR</span>
            </div>

            <div className="bg-white rounded-xl p-2 mb-4 w-fit">
              {amount > 0 ? (
                <Image
                  src={qrUrl}
                  alt="VietQR Code"
                  width={280}
                  height={280}
                  className="rounded-lg"
                  unoptimized
                />
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>

            <p className="text-gray-500 text-sm text-center">
              Mở app ngân hàng → Quét mã QR → Xác nhận chuyển khoản
            </p>
          </div>

          {/* Bank details + order info */}
          <div className="space-y-4">
            {/* Order summary */}
            {plan && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CreditCard size={18} className="text-purple-400" />
                  Thông tin đơn hàng
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gói</span>
                    <span className="text-white font-medium">{plan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Thời hạn</span>
                    <span className="text-white">{plan.durationMonths} tháng</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                    <span className="text-gray-400 font-medium">Tổng thanh toán</span>
                    <span className="text-2xl font-black text-white">{plan.price.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bank info */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Building2 size={18} className="text-blue-400" />
                Thông tin chuyển khoản
              </h3>
              <div className="space-y-3">
                <InfoRow label="Ngân hàng" value={BANK_CONFIG.bankName} />
                <InfoRow
                  label="Số tài khoản"
                  value={BANK_CONFIG.accountNo}
                  copiable
                  copied={copied === 'stk'}
                  onCopy={() => copyToClipboard(BANK_CONFIG.accountNo, 'stk')}
                />
                <InfoRow label="Chủ tài khoản" value={BANK_CONFIG.accountName} />
                <InfoRow
                  label="Số tiền"
                  value={`${amount.toLocaleString('vi-VN')}đ`}
                  copiable
                  copied={copied === 'amount'}
                  onCopy={() => copyToClipboard(String(amount), 'amount')}
                />
                <InfoRow
                  label="Nội dung CK"
                  value={orderCode}
                  copiable
                  copied={copied === 'code'}
                  onCopy={() => copyToClipboard(orderCode, 'code')}
                  highlight
                />
              </div>
            </div>

            {/* Important notice */}
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-300 text-sm font-medium mb-1">⚠️ Lưu ý quan trọng</p>
              <p className="text-amber-200/70 text-xs">
                Vui lòng nhập đúng nội dung chuyển khoản <strong className="text-amber-200">{orderCode}</strong> để được kích hoạt tự động.
                Tài khoản sẽ được nâng cấp trong vòng vài phút sau khi xác nhận thanh toán.
              </p>
            </div>

            {/* Polling status */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-2">
              <Clock size={14} className="animate-pulse" />
              <span>Đang chờ xác nhận thanh toán...</span>
            </div>
          </div>
        </div>

        {/* Cancel / back */}
        <div className="text-center mt-8">
          <Link href="/pricing" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Quay lại chọn gói khác
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copiable,
  copied,
  onCopy,
  highlight,
}: {
  label: string;
  value: string;
  copiable?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            highlight ? 'text-amber-300 font-bold text-base' : 'text-white'
          }`}
        >
          {value}
        </span>
        {copiable && (
          <button
            onClick={onCopy}
            className="text-gray-500 hover:text-purple-400 transition-colors p-1"
            title="Sao chép"
          >
            {copied ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
