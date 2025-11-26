import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="flex-shrink-0 h-full overflow-y-auto">
        <Sidebar />
      </div>
      <main className="flex-1 h-full overflow-y-auto p-8">{children}</main>
    </div>
  );
};

export default Layout;

