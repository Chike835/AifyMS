import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Store, Bell, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TopBar = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAccountMenu, setShowAccountMenu] = useState(false);

    const notifRef = useRef(null);
    const accountRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (accountRef.current && !accountRef.current.contains(event.target)) {
                setShowAccountMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white z-30 px-4 flex items-center justify-between shadow-sm">
            {/* Left: Mobile Menu & POS */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <Link
                    to="/pos"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
                >
                    <Store className="h-5 w-5" />
                    <span className="font-medium">POS</span>
                </Link>
            </div>

            {/* Right: Notifications & Account */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 text-blue-900 hover:bg-gray-100 rounded-full relative transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="h-6 w-6" />
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900">Notifications</h3>
                                <span className="text-xs text-blue-600 font-medium">Mark all as read</span>
                            </div>
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                No new notifications
                            </div>
                        </div>
                    )}
                </div>

                {/* Account */}
                <div className="relative" ref={accountRef}>
                    <button
                        onClick={() => setShowAccountMenu(!showAccountMenu)}
                        className="flex items-center gap-2 focus:outline-none group"
                    >
                        <div className="h-10 w-10 bg-gray-900 rounded-full flex items-center justify-center text-white ring-2 ring-gray-100 group-hover:ring-gray-300 transition-all">
                            <User className="h-5 w-5" />
                        </div>
                    </button>

                    {showAccountMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                            </div>

                            <div className="py-1 border-t border-gray-100">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
