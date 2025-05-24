console.log("content.js scraper is live");

function extractJobInfoFromTags() {
    const modal = document.querySelector(".modal__content.height--100.overflow--hidden");
    if (!modal) {
      console.warn("Selector not found");
      return {};
    }
  
    const infoBlocks = modal.querySelectorAll(".tag__key-value-list.js--question--container");
    const jobData = {};
  
    infoBlocks.forEach((block) => {
      const labelSpan = block.querySelector("span.label");
      if (!labelSpan) return;
  
      const label = labelSpan.innerText.trim().replace(/:$/, "");
        const nodes = Array.from(block.querySelectorAll("p, li"))
        .map((el) => el.innerText.trim())
        .filter(Boolean);
  
      let value;
      if (nodes.length) {
        value = nodes.join("\n\n");
      } else {
        const allLines = block.innerText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (allLines[0] === label + ":") allLines.shift();
        value = allLines.join("\n\n");
      }
  
      jobData[label] = value;
    });
  
    return jobData;
  }

  // function injectWatReachButton(modal) {
  //   const old = document.getElementById("watreach-btn");
  //   if (old) old.remove();
  
  //   modal.style.position = "relative";  // 👈 Add this

  //   const button = document.createElement("button");
  //   button.id = "watreach-btn";
  //   button.innerText = "🔍 Find People";
  //   button.style.position = "absolute";
  //   button.style.top = "20px";
  //   button.style.right = "20px";
  //   button.style.zIndex = "99999";  // 👈 Increase this
  //   button.style.padding = "12px 20px";
  //   button.style.background = "#0066ff";
  //   button.style.color = "white";
  //   button.style.borderRadius = "6px";
  //   button.style.border = "none";
  //   button.style.cursor = "pointer";
  
  //   button.onclick = () => {
  //     const job = extractJobInfoFromTags();
  //     console.log("✅ WatReach Job Data:", job);
  //     alert("Scraped job info:\n" + JSON.stringify(job, null, 2));
  //     // TODO: Send to backend here
  //   };
  
  //   // ✅ inject into the modal element, not body
  //   modal.appendChild(button);
  // }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanJobPosting") {
      const job = extractJobInfoFromTags();
      console.log("✅ Job Data sent to popup:", job);
      sendResponse(job); // send the data back to React
    }
  });
  
  // what is this 
  const observer = new MutationObserver(() => {
    const modal = document.querySelector('.modal__content.height--100.overflow--hidden');
    const alreadyInjected = document.getElementById("watreach-btn");
  
    if (modal && !alreadyInjected) {
      console.log("🟢 Modal detected, injecting button...");
      injectWatReachButton(modal);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
