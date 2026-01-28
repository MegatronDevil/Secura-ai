import { Button } from "@/components/ui/button";
import { PlusSquare, Home, Search, Heart, User, LogOut } from "lucide-react";

interface InstagramHomeProps {
  username: string;
  isVerified: boolean;
  onCreatePost: () => void;
  onLogout: () => void;
  onExitDemo: () => void;
}

export default function InstagramHome({ 
  username, 
  isVerified, 
  onCreatePost, 
  onLogout,
  onExitDemo 
}: InstagramHomeProps) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Billabong', cursive" }}>
              Instagram
            </h1>
            <p className="text-[10px] text-primary -mt-1">Protected by Secura.AI</p>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onCreatePost}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Create new post"
            >
              <PlusSquare className="h-6 w-6 text-gray-900" />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Log out"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center space-y-6">
          {/* User Welcome */}
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center justify-center gap-2">
              @{username}
              {isVerified && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#0095f6] rounded-full">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </h2>
            {isVerified && (
              <p className="text-xs text-[#0095f6] mt-1">Verified Identity</p>
            )}
          </div>

          {/* Empty State */}
          <div className="py-12">
            <div className="w-24 h-24 mx-auto border-2 border-gray-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeWidth={1.5} />
              </svg>
            </div>
            <h3 className="text-3xl font-light text-gray-900 mb-2">Share Photos</h3>
            <p className="text-gray-500 text-sm mb-6">
              When you share photos, they will appear on your profile.
            </p>
            <button 
              onClick={onCreatePost}
              className="text-[#0095f6] font-semibold text-sm hover:text-[#00376b]"
            >
              Share your first photo
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation (Mobile Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 md:hidden">
        <div className="flex items-center justify-around h-14">
          <button className="p-3">
            <Home className="h-6 w-6 text-gray-900" fill="currentColor" />
          </button>
          <button className="p-3">
            <Search className="h-6 w-6 text-gray-600" />
          </button>
          <button onClick={onCreatePost} className="p-3">
            <PlusSquare className="h-6 w-6 text-gray-600" />
          </button>
          <button className="p-3">
            <Heart className="h-6 w-6 text-gray-600" />
          </button>
          <button className="p-3">
            <User className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </nav>

      {/* Exit Demo Button */}
      <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExitDemo}
          className="bg-white shadow-lg text-xs"
        >
          Exit Demo → Back to Secura.AI
        </Button>
      </div>
    </div>
  );
}
