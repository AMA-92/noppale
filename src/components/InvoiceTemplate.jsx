import React, { useRef, useEffect, useState } from 'react';
import { 
  Building2, 
  User, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { appStorage } from '../utils/storage';

const InvoiceTemplate = ({
  shopLogo,
  shopName,
  customerName,
  invoiceNumber,
  paymentMethod,
  items,
  total,
  phone,
  email,
  address,
  date,
  slogan = "Solutions de gestion pour votre entreprise",
  autoExport = false
}) => {
  const invoiceRef = useRef(null);
  const [fetchedShopLogo, setFetchedShopLogo] = useState(null);

  // Generate automatic invoice number (10 digits)
  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return (timestamp + random).slice(-10);
  };

  // Format date for filename (DD-MM-YY)
  const formatDateForFilename = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  // Fetch shop logo from settings
  useEffect(() => {
    const fetchShopLogo = async () => {
      try {
        const shopInfo = await appStorage.getShopInfo();
        console.log('Shop info fetched:', shopInfo);
        if (shopInfo && shopInfo.logo) {
          console.log('Logo found:', shopInfo.logo);
          setFetchedShopLogo(shopInfo.logo);
        } else {
          console.log('No logo found in shop info, using prop logo if available');
        }
      } catch (error) {
        console.error('Error fetching shop logo:', error);
      }
    };
    fetchShopLogo();
  }, []);

  // Use prop logo first, then fetched logo
  const displayLogo = shopLogo || fetchedShopLogo;
  // Always generate automatic invoice number (10 digits)
  const displayInvoiceNumber = generateInvoiceNumber();

  const exportToPDF = async () => {
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;
    
    // Format filename: facture-{client}-{date}
    const formattedDate = formatDateForFilename(date);
    const sanitizedCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `facture-${sanitizedCustomerName}-${formattedDate}.pdf`;
    
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(filename);
  };

  // Auto-export PDF when component mounts if autoExport is true
  useEffect(() => {
    if (autoExport) {
      const timer = setTimeout(() => {
        exportToPDF();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoExport]);

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  return (
    <div 
      ref={invoiceRef}
      className="bg-white"
      style={{ 
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        margin: '0 auto',
        position: 'relative'
      }}
    >
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-200 to-emerald-100 rounded-full blur-3xl opacity-30 -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-green-200 to-emerald-100 rounded-full blur-3xl opacity-30 translate-y-32 -translate-x-32" />

        {/* HEADER */}
        <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Left side - Shop info */}
            <div className="flex items-center gap-4">
              {displayLogo ? (
                <img 
                  src={displayLogo} 
                  alt="Logo" 
                  className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-2xl shadow-lg bg-white"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-green-500 via-green-400 to-emerald-300 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building2 size={48} className="text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">{shopName}</h1>
                <p className="text-xs md:text-sm text-gray-600 mt-1">{slogan}</p>
              </div>
            </div>

            {/* Right side - Invoice card */}
            <div className="bg-gradient-to-r from-green-500 via-green-400 to-emerald-300 rounded-2xl p-4 md:p-6 shadow-xl">
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">FACTURE</h2>
              <div className="space-y-1">
                <p className="text-white/90 text-xs md:text-sm font-medium">
                  <span className="opacity-80">N°</span> {displayInvoiceNumber}
                </p>
                <p className="text-white/90 text-xs md:text-sm font-medium">{date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* INFORMATION SECTION */}
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Client Information Card */}
            <div className="bg-white border-2 border-green-200 rounded-xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-lg flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">INFORMATIONS CLIENT</h3>
              </div>
              <div className="space-y-1">
                <p className="text-gray-700 font-semibold text-base">{customerName}</p>
                <p className="text-gray-500 text-xs">{date}</p>
              </div>
            </div>

            {/* Payment Information Card */}
            <div className="bg-white border-2 border-green-200 rounded-xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">INFORMATIONS DE PAIEMENT</h3>
              </div>
              <div className="space-y-1">
                <p className="text-gray-700 font-semibold text-base">{paymentMethod}</p>
                <p className="text-gray-500 text-xs">Mode de paiement</p>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-200 via-green-100 to-emerald-100 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full">
                <thead>
                  <tr className="text-green-800">
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Article</th>
                    <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider">Quantité</th>
                    <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Prix Unitaire</th>
                    <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {items.map((item, index) => (
                    <tr 
                      key={index} 
                      className={`border-b border-green-100 hover:bg-green-50 transition-colors duration-200 ${
                        index === items.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-800 font-medium text-sm">{item.name}</td>
                      <td className="px-4 py-3 text-center text-gray-600 text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600 text-sm">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-semibold text-sm">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTAL SECTION */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800">TOTAL À PAYER</h3>
                <p className="text-gray-600 text-xs mt-1">Montant total de la facture</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 via-green-400 to-emerald-300 rounded-xl px-6 py-3 shadow-lg">
                <p className="text-white text-xl md:text-2xl font-bold">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-white border-t-2 border-green-100 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Address */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-white" />
              </div>
              <p className="text-gray-700 text-sm">{address}</p>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone size={16} className="text-white" />
              </div>
              <p className="text-gray-700 text-sm">{phone}</p>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail size={16} className="text-white" />
              </div>
              <p className="text-gray-700 text-sm">{email}</p>
            </div>
          </div>

          {/* Thank you message */}
          <div className="text-center">
            <p className="text-base font-bold text-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Merci pour votre confiance !
            </p>
          </div>
        </div>
      </div>
  );
};

export default InvoiceTemplate;
