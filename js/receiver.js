const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

// Static MP3 file URL (will be hosted on GitHub Pages)
const STATIC_AUDIO_URL = "https://lister.brj.one/audio.mp3";

// Debug Logger
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();
const LOG_TAG = 'ListerReceiver';

// Enable debug logger
castDebugLogger.setEnabled(true);

// Set verbosity level for Core events.
castDebugLogger.loggerLevelByEvents = {
  'cast.framework.events.category.CORE': cast.framework.LoggerLevel.INFO,
  'cast.framework.events.EventType.MEDIA_STATUS': cast.framework.LoggerLevel.DEBUG
}

// Set verbosity level for custom tags.
castDebugLogger.loggerLevelByTags = {
    LOG_TAG: cast.framework.LoggerLevel.DEBUG,
};

// Auto-load and loop the static MP3 file
function autoLoadMedia() {
  const mediaInformation = new cast.framework.messages.MediaInformation();
  mediaInformation.contentId = STATIC_AUDIO_URL;
  mediaInformation.contentUrl = STATIC_AUDIO_URL;
  mediaInformation.contentType = 'audio/mpeg';
  
  // Add metadata
  const metadata = new cast.framework.messages.GenericMediaMetadata();
  metadata.title = 'Lister Audio';
  metadata.subtitle = 'Game Audio Track - Looping';
  metadata.images = [
    new cast.framework.messages.Image('https://lister.brj.one/favicon.ico')
  ];
  mediaInformation.metadata = metadata;
  
  // Set up looping
  mediaInformation.tracks = [];
  
  const loadRequestData = new cast.framework.messages.LoadRequestData();
  loadRequestData.media = mediaInformation;
  loadRequestData.autoplay = true;
  
  castDebugLogger.info(LOG_TAG, 'Auto-loading static MP3 with looping:', STATIC_AUDIO_URL);
  
  // Load the media
  playerManager.load(loadRequestData);
}

// Intercept LOAD requests to handle static MP3 playback (for external senders)
playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  request => {
    castDebugLogger.info(LOG_TAG, 'Intercepting LOAD request for static MP3');

    return new Promise((resolve, reject) => {
      try {
        // Set up the static MP3 file
        request.media.contentUrl = STATIC_AUDIO_URL;
        request.media.contentType = 'audio/mpeg';
        
        // Add metadata for the audio file
        let metadata = new cast.framework.messages.GenericMediaMetadata();
        metadata.title = 'Lister Audio';
        metadata.subtitle = 'Game Audio Track - Looping';
        
        // Optional: Add an image for the audio
        metadata.images = [
          new cast.framework.messages.Image('https://lister.brj.one/favicon.ico')
        ];

        request.media.metadata = metadata;
        
        castDebugLogger.info(LOG_TAG, 'Playing static MP3:', request.media.contentUrl);
        
        // Resolve the modified request
        resolve(request);
      } catch (error) {
        castDebugLogger.error(LOG_TAG, 'Error setting up MP3 playback:', error);
        reject(error);
      }
    });
  });

// Set up touch controls for audio playback
const touchControls = cast.framework.ui.Controls.getInstance();
const playerData = new cast.framework.ui.PlayerData();
const playerDataBinder = new cast.framework.ui.PlayerDataBinder(playerData);

// Configure player controls for audio
playerDataBinder.addEventListener(
  cast.framework.ui.PlayerDataEventType.MEDIA_CHANGED,
  (e) => {
    if (!e.value) return;

    // Clear default buttons and set up audio-specific controls
    touchControls.clearDefaultSlotAssignments();
    
    // Add common audio controls
    touchControls.assignButton(
      cast.framework.ui.ControlsSlot.SLOT_PRIMARY_1,
      cast.framework.ui.ControlsButton.SEEK_BACKWARD_15
    );
    touchControls.assignButton(
      cast.framework.ui.ControlsSlot.SLOT_PRIMARY_2,
      cast.framework.ui.ControlsButton.SEEK_FORWARD_15
    );
    
    castDebugLogger.info(LOG_TAG, 'Audio controls configured');
  });

// Listen for player events
playerManager.addEventListener(
  cast.framework.events.EventType.PLAYER_LOAD_COMPLETE,
  () => {
    castDebugLogger.info(LOG_TAG, 'Static MP3 loaded successfully');
    updateUIStatus('Audio playing and looping');
  });

playerManager.addEventListener(
  cast.framework.events.EventType.PLAYER_LOADING,
  () => {
    castDebugLogger.info(LOG_TAG, 'Loading audio...');
    updateUIStatus('Loading audio...');
  });

playerManager.addEventListener(
  cast.framework.events.EventType.ERROR,
  (errorEvent) => {
    castDebugLogger.error(LOG_TAG, 'Player error:', errorEvent.detailedErrorCode);
    updateUIStatus('Error loading audio - retrying...');
    // Retry loading after a delay
    setTimeout(autoLoadMedia, 5000);
  });

// Handle when media ends - restart it for looping
playerManager.addEventListener(
  cast.framework.events.EventType.MEDIA_STATUS,
  (event) => {
    const mediaStatus = event.mediaStatus;
    if (mediaStatus && mediaStatus.playerState === cast.framework.messages.PlayerState.IDLE) {
      if (mediaStatus.idleReason === cast.framework.messages.IdleReason.FINISHED) {
        castDebugLogger.info(LOG_TAG, 'Audio finished, restarting for loop');
        updateUIStatus('Restarting audio loop...');
        setTimeout(autoLoadMedia, 1000); // Small delay before restarting
      }
    } else if (mediaStatus && mediaStatus.playerState === cast.framework.messages.PlayerState.PLAYING) {
      updateUIStatus('Audio playing and looping');
    }
  });

// Update UI status function
function updateUIStatus(status) {
  const statusElements = document.querySelectorAll('.player-card div');
  if (statusElements.length > 3) { // Updated index for new structure
    statusElements[3].textContent = status;
  }
  
  // Also update page title to show audio status
  document.title = `LISTER - ${status}`;
}

// Set initial context options
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;
options.maxInactivity = 0; // Never idle out
options.skipPlayersLoad = false;

// Start the receiver context
context.start(options).then(() => {
  castDebugLogger.info(LOG_TAG, 'Cast receiver started, auto-loading audio');
  updateUIStatus('Starting audio...');
  // Auto-load the media after a short delay to ensure everything is ready
  setTimeout(autoLoadMedia, 2000);
});
