import os
import re

def fix_app():
    path = r'c:\Users\Orion\Desktop\KICK UP KING GAME\kick-up-king-8\components\App.tsx'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Fix the broken block around line 179
    # Match more broadly to be safe
    pattern = r'if \(profile\.highScore > parsedHS\) \{.*?newHighScore = profile\.highScore; const handleRefreshData = async \(\) => \{.*?setHighScore\(profile\.highScore\);'
    replacement = 'if (profile.highScore > parsedHS) {\n                                newHighScore = profile.highScore;\n                                setHighScore(profile.highScore);'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # 2. Add handleRefreshData to component body if not already there
    if 'const handleRefreshData = async () => {' not in new_content:
        # Insert before the first useEffect
        new_content = new_content.replace('useEffect(() => {', """const handleRefreshData = async () => {
        setCloudError(null);
        dbService.getOnlineUsers(userId, username, highScore).then(setOnlinePlayers);
        dbService.getGlobalLeaderboard().then(setGlobalLeaderboard);
        if (userId) {
            const requests = await dbService.getIncomingRequests(userId);
            setFriendRequests(requests);
            addNotification("Cloud Refresh", "Latest player data synchronized!", "success");
        }
    };

    useEffect(() => {""", 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed App.tsx")

def fix_ui():
    path = r'c:\Users\Orion\Desktop\KICK UP KING GAME\kick-up-king-8\components\UIOverlay.tsx'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Re-writing the Top Bar area precisely
    # We match from the MENU check to the first sidebar button
    pattern = r'{gameState === \'MENU\' && \(.*?<>\s*/\* Top Bar Area - PROFILE & SOCIAL \*/\}.*?Coins size=\{18\}.*?</span>\s*</div>\s*</div>\s*</div>'
    
    replacement = """{gameState === 'MENU' && (
                    <>
                        {/* Top Bar Area - PROFILE & SOCIAL */}
                        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-50">
                            {/* TOP LEFT: PROFILE GROUP */}
                            <div className="flex flex-col gap-2 pointer-events-auto">
                                <div className="flex items-center gap-2 bg-blue-600/90 border-2 border-blue-400 p-1 pr-4 rounded-xl shadow-lg transform hover:scale-105 transition-transform cursor-pointer shadow-black/30 w-fit">
                                    <div className="w-10 h-10 bg-blue-800 rounded-lg flex items-center justify-center border border-white/20 relative overflow-hidden">
                                        <UserCircle size={24} className="text-white relative z-10" />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 to-transparent"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-arcade text-sm leading-none drop-shadow-md">{username || "Guest"}</span>
                                        <span className="text-yellow-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Trophy size={10} /> Best: {highScore}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={onHardReset}
                                        className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-red-400 bg-black/40 px-2 py-1 rounded-full w-fit backdrop-blur-sm border border-white/10 transition-colors"
                                        title="Delete Save Data"
                                    >
                                        <Trash2 size={10} /> RESET CAREER
                                    </button>

                                    {cloudError ? (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-600/90 px-2 py-1 rounded-full w-fit backdrop-blur-sm border border-white/20 animate-pulse shadow-lg">
                                            <AlertTriangle size={10} /> CLOUD ERROR
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-black/40 px-2 py-1 rounded-full w-fit backdrop-blur-sm border border-white/10">
                                            <Cloud size={10} /> SYNCED
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* TOP RIGHT: SOCIAL & COINS */}
                            <div className="pointer-events-auto flex items-center gap-2 bg-black/40 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
                                <button onClick={onOpenFriends} className="relative bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-xl shadow-lg transition-all active:scale-95 group">
                                    <Users size={20} className="text-white group-hover:text-blue-400 transition-colors" />
                                    {onlinePlayers.length > 0 && <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow animate-bounce">{onlinePlayers.length}</div>}
                                </button>
                                <button onClick={onOpenInbox} className="relative bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-xl shadow-lg transition-all active:scale-95 group">
                                    <Mail size={20} className="text-white group-hover:text-yellow-200 transition-colors" />
                                    {totalUnread > 0 && <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow animate-pulse">{totalUnread}</div>}
                                </button>
                                {onToggleFullscreen && (
                                    <button 
                                        onClick={onToggleFullscreen}
                                        className="bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-xl shadow-lg transition-all active:scale-95 group text-white"
                                        title="Toggle Fullscreen"
                                    >
                                        <Maximize size={20} className="group-hover:text-blue-300 transition-colors" />
                                    </button>
                                )}
                                <div className="w-px h-8 bg-white/20 mx-1"></div>
                                <div className="flex items-center gap-2 bg-black/60 border border-yellow-500/50 px-3 py-1.5 rounded-xl shadow-lg">
                                    <Coins size={18} className="text-yellow-400 fill-yellow-400" />
                                    <span className="text-white font-arcade text-lg">{tokens}</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}"""
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed UIOverlay.tsx")

def fix_db():
    path = r'c:\Users\Orion\Desktop\KICK UP KING GAME\kick-up-king-8\services\databaseService.ts'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r"\.order\('high_score', \{ ascending: false \}\)\s*\.limit\(50\);", 
                         ".order('high_score', { ascending: false })\n                 .order('created_at', { ascending: false })\n                 .limit(100);", 
                         content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed databaseService.ts")

fix_app()
fix_ui()
fix_db()
