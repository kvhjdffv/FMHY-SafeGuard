document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup loaded, preparing to check site status...");

  const statusIcon = document.getElementById("status-icon");
  const statusMessage = document.getElementById("status-message");
  const errorMessage = document.getElementById("error-message");

  // Helper function to normalize URLs (removes trailing slashes)
  const normalizeUrl = (url) => url.replace(/\/+$/, "").trim();

  // Helper function to extract the root domain from a URL
  function extractRootDomain(url) {
    let urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  }

  try {
    // Get the active tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.url) {
        throw new Error("No active tab found or URL is unavailable.");
      }

      const currentUrl = normalizeUrl(activeTab.url);
      const rootDomain = extractRootDomain(currentUrl);
      console.log(`Active tab URL: ${currentUrl}, Root domain: ${rootDomain}`);

      // Send a message to the background script to check the site's status
      chrome.runtime.sendMessage(
        { action: "checkSiteStatus", url: currentUrl },
        (response) => {
          if (!response || !response.status) {
            throw new Error(
              "Failed to retrieve site status from the background script."
            );
          }

          // Determine if the root domain or the full URL is marked as safe/starred
          chrome.runtime.sendMessage(
            { action: "checkSiteStatus", url: rootDomain },
            (isRootDomainMarked) => {
              // Handle different site statuses and update the UI accordingly
              if (
                isRootDomainMarked.status === response.status &&
                response.status !== "no_data"
              ) {
                // If both the root domain and the current URL share the same status, show the root domain in the message
                handleStatusUpdate(response.status, rootDomain);
              } else {
                // Otherwise, show the current URL in the message
                handleStatusUpdate(response.status, currentUrl);
              }
            }
          );
        }
      );
    });
  } catch (error) {
    console.error("Error while checking site status:", error);
    errorMessage.textContent = `Error: ${error.message}`;
    updateUI("error", "An error occurred while retrieving the site status.");
  }

  /**
   * Updates the UI based on the site status
   * @param {string} status - The status of the site (e.g., "safe", "unsafe")
   * @param {string} displayUrl - The URL or root domain to display in the message
   */
  function handleStatusUpdate(status, displayUrl) {
    switch (status) {
      case "unsafe":
        updateUI(
          "unsafe",
          `${displayUrl} is flagged as <strong>unsafe</strong>. Be cautious when interacting with this site.`
        );
        break;
      case "potentially_unsafe":
        updateUI(
          "potentially_unsafe",
          `${displayUrl} is <strong>potentially unsafe</strong>. Proceed with caution.`
        );
        break;
      case "safe":
        updateUI("safe", `${displayUrl} is <strong>safe</strong> to browse.`);
        break;
      case "starred":
        updateUI(
          "starred",
          `${displayUrl} is a <strong>starred</strong> site.`
        );
        break;
      case "no_data":
        updateUI(
          "no_data",
          `No data available for <strong>${displayUrl}</strong>.`
        );
        break;
      default:
        updateUI(
          "unknown",
          `An unknown status was received for <strong>${displayUrl}</strong>.`
        );
    }
  }

  /**
   * Updates the UI with the appropriate icon, message, and effects.
   * @param {string} status - The status of the site (e.g., "safe", "unsafe").
   * @param {string} message - The message to display to the user.
   */
  function updateUI(status, message) {
    const icons = {
      unsafe: "../res/icons/unsafe.png",
      potentially_unsafe: "../res/icons/potentially_unsafe.png",
      safe: "../res/icons/safe.png",
      starred: "../res/icons/starred.png",
      no_data: "../res/ext_icon_144.png",
      error: "../res/icons/error.png",
      unknown: "../res/ext_icon_144.png",
    };

    // Update the icon and message
    statusIcon.src = icons[status] || icons["unknown"];
    statusMessage.innerHTML = message || "An unknown error occurred.";

    // Add a small animation when the status changes
    statusIcon.classList.add("active");
    setTimeout(() => statusIcon.classList.remove("active"), 300);

    console.log(`UI updated: ${message}`);
  }
});
