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

  // Format date for filename (DD/MM/YY)
  const formatDateForFilename = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
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
          console.log('No logo found in shop info');
        }
      } catch (error) {
        console.error('Error fetching shop logo:', error);
      }
    };
    fetchShopLogo();
  }, []);

  // Use fetched logo if no logo prop is provided
  const displayLogo = fetchedShopLogo || shopLogo;
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
        <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {/* Left side - Shop info */}
            <div className="flex items-center gap-4">
              {displayLogo ? (
                <img 
                  src={displayLogo} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain rounded-2xl shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 via-green-400 to-emerald-300 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building2 size={32} className="text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{shopName}</h1>
                <p className="text-sm text-gray-600 mt-1">{slogan}</p>
              </div>
            </div>

            {/* Right side - Invoice card */}
            <div className="bg-gradient-to-r from-green-500 via-green-400 to-emerald-300 rounded-2xl p-6 shadow-xl">
              <h2 className="text-white text-3xl md:text-4xl font-bold mb-3">FACTURE</h2>
              <div className="space-y-2">
                <p className="text-white/90 text-sm font-medium">
                  <span className="opacity-80">N°</span> {displayInvoiceNumber}
                </p>
                <p className="text-white/90 text-sm font-medium">{date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* INFORMATION SECTION */}
        <div className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Client Information Card */}
            <div className="bg-white border-2 border-green-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">INFORMATIONS CLIENT</h3>
              </div>
              <div className="space-y-2">
                <p className="text-gray-700 font-semibold text-lg">{customerName}</p>
                <p className="text-gray-500 text-sm">{date}</p>
              </div>
            </div>

            {/* Payment Information Card */}
            <div className="bg-white border-2 border-green-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center">
                  <CreditCard size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">INFORMATIONS DE PAIEMENT</h3>
              </div>
              <div className="space-y-2">
                <p className="text-gray-700 font-semibold text-lg">{paymentMethod}</p>
                <p className="text-gray-500 text-sm">Mode de paiement</p>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-500 via-green-400 to-emerald-300 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full">
                <thead>
                  <tr className="text-white">
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Article</th>
                    <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Quantité</th>
                    <th className="px-6 py-4 text-right font-bold text-sm uppercase tracking-wider">Prix Unitaire</th>
                    <th className="px-6 py-4 text-right font-bold text-sm uppercase tracking-wider">Total</th>
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
                      <td className="px-6 py-4 text-gray-800 font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="px-6 py-4 text-right text-gray-800 font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTAL SECTION */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800">TOTAL À PAYER</h3>
                <p className="text-gray-600 mt-2">Montant total de la facture</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 via-green-400 to-emerald-300 rounded-2xl px-8 py-6 shadow-xl">
                <p className="text-white text-3xl md:text-4xl font-bold">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-white border-t-2 border-green-100 p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Address */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-white" />
              </div>
              <p className="text-gray-700">{address}</p>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone size={20} className="text-white" />
              </div>
              <p className="text-gray-700">{phone}</p>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-white" />
              </div>
              <p className="text-gray-700">{email}</p>
            </div>
          </div>

          {/* Thank you message */}
          <div className="text-center">
            <p className="text-xl font-bold text-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Merci pour votre confiance !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
