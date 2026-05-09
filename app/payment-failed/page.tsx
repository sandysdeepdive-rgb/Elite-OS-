
import Link from "next/link";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const ref = params.ref;
  const status = params.status;

  return (
    <div className="min-h-screen mesh-gradient-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <span className="material-symbols-outlined text-red-600 text-4xl">error</span>
        </div>
        
        <h1 className="text-5xl font-light text-[#2B4D5A] font-headline">
          Payment Failed
        </h1>
        
        <p className="text-lg font-light text-[#5f5e60] leading-relaxed font-body">
          We were unable to process your payment at this time.
          {status === "Failed" && " The payment was declined. Please check your mobile money balance and try again."}
          {status === "Invalid" && " The payment request was invalid. Please contact support."}
          {status === "Reversed" && " This payment was reversed. Please contact your school administrator."}
          {!["Failed", "Invalid", "Reversed"].includes(status as string) && status && ` Pesapal status: ${status}.`}
          {" "}Please try again or contact support if the problem persists.
        </p>

        {ref && (
          <div className="bg-white/40 border border-[#c1c7cb]/20 rounded-2xl p-4">
            <p className="text-[10px] text-[#72787b] uppercase tracking-widest mb-1 font-mono">
              Reference Number
            </p>
            <p className="font-medium text-[#1b1c19] text-sm font-mono">
              {ref}
            </p>
          </div>
        )}

        <div className="pt-8 flex flex-col gap-3 items-center">
          <Link
            href="/"
            className="inline-block bg-[#2B4D5A] text-white px-8 py-3 rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-95 font-body"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="text-sm text-[#72787b] hover:text-[#1b1c19] transition-colors font-body"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
