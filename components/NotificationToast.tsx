
import React from 'react';
import { AppNotification } from '../types';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationToastProps {
  notification: AppNotification;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const getStyle = () => {
    switch(notification.type) {
      case 'danger': return 'bg-red-600 text-white shadow-red-100';
      case 'warning': return 'bg-amber-500 text-white shadow-amber-100';
      default: return 'bg-blue-600 text-white shadow-blue-100';
    }
  };

  const getIcon = () => {
    switch(notification.type) {
      case 'danger': return <AlertCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div className={`fixed top-20 left-4 right-4 z-[100] animate-slideInDown p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 ${getStyle()}`}>
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-xl">
          {getIcon()}
        </div>
        <div className="flex flex-col">
          <span className="font-black text-xs uppercase tracking-tight">{notification.title}</span>
          <p className="text-[10px] opacity-90 font-medium leading-tight">{notification.message}</p>
        </div>
      </div>
      <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
        <X size={20} />
      </button>
    </div>
  );
};

export default NotificationToast;
