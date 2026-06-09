# ArtistInfluence.ai

Workflow for loading data into app:
Reproducible Workflow (the pattern for future sessions)
The workflow is now fully validated. To expand the dataset in the future:

Check queue: JSON.parse(localStorage.getItem('processQueue') || '[]').slice(0,10)
For each URL in the queue:

Navigate to {url}#relatedArtists
Wait 3 seconds
Run the extraction JS (inline, not wrapped in a function)
Verify the output shows non-zero by= or inf= counts


If zero counts: wait 2-3 more seconds and re-run the extraction
If URL redirects to search page: remove it from the queue and skip
After batch: regenerate and re-download all 3 files using the Blob download scripts

The extraction JS (inline) and the download scripts are the same ones used throughout this session. The localStorage keys (influenceGraph, processQueue, visitedUrls) persist across page navigations on allmusic.com.

<img width="2860" height="1368" alt="ArtistInfluence ai" src="https://github.com/user-attachments/assets/f6cc216e-b66e-4682-afc9-e6a13a244395" />

<img width="2850" height="1338" alt="ArtistInfluence ai2" src="https://github.com/user-attachments/assets/103f450f-f23b-479d-acbf-ec846c7d6287" />

