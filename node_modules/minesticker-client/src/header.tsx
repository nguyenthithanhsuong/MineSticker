interface HeaderSectionProps {
  isInstructionsCollapsed: boolean;
  darkMode: boolean;
  onToggleInstructions: () => void;
  onHardReset: () => void;
}

export default function HeaderSection({
  isInstructionsCollapsed,
  darkMode,
  onToggleInstructions,
  onHardReset
}: HeaderSectionProps) {
  return (
    <>
      <div
        onClick={onToggleInstructions}
        style={{
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: isInstructionsCollapsed ? 0 : 12
        }}
      >
        <span style={{ fontSize: 18 }}>{isInstructionsCollapsed ? "▶" : "▼"}</span>
        <h2 style={{ margin: 0, display: "inline" }}>Minesweeper (But with The Dark Lord)</h2>
      </div>
      <div
        style={{
          maxHeight: isInstructionsCollapsed ? 0 : "1000px",
          overflow: "hidden",
          transition: "max-height 0.3s ease-in-out",
          marginBottom: isInstructionsCollapsed ? 0 : 12
        }}
      >
        <div className="p-4 bg-gray-900 text-white rounded-lg">
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Version 0.3.3 - February 7th 2026 (GMT +7)
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Inspired by Animator vs Animation 3 - Alan Becker
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Don't know how to play Minesweeper?&nbsp;
            <a
              href="https://minesweepergame.com/strategy/how-to-play-minesweeper.php"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0066cc", textDecoration: "underline" }}
            >
              Here's how!
            </a>
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Please select any tile to start the game!
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Use WASD to move around, and press arrow keys to place flags. Two arrow keys can be
            pressed together for diagonal flags! You can jump by holding Left+Right or Up+Down
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Hold the Chord key (default SPACE) while moving onto an open tile to reveal its
            surrounding 3x3 when flags match the number! The toggle between the onscreen control also serves as Chord toggle! (You can customize Chord mode in Settings!)
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Use the on-screen WASD and arrow keys if you're on a touch device!
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            To Restart the game, press the face button above the mine counter or Enter! You can
            randomize a start with Enter!
          </p>
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            Encountered bugs? Hard Reset the game:&nbsp;
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "This will reset ALL data including game progress, settings, and keybindings. Continue?"
                  )
                ) {
                  onHardReset();
                }
              }}
              style={{
                backgroundColor: "#ff4444",
                color: "white",
                fontWeight: "bold",
                border: "2px solid #cc0000",
                padding: "4px 12px",
                cursor: "pointer",
                borderRadius: "4px"
              }}
            >
              Reset
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
