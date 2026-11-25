(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const icons = () => window.lucide?.createIcons();
  const cases = {
    bakery: {
      model: "MiniMax-H3", category: "NATIVE PROXY · MULTI-SHOT",
      description: "Two people, one parcel, three shots. Proxy guidance anchors the same conversation in the same space.",
      without: "The room and object details drift across cuts.",
      with: "More stable seating, eyelines, and parcel placement.",
    },
    gate: {
      model: "Seedance-2.5", category: "NATIVE PROXY · DYNAMIC ACTION",
      description: "A character approaches and passes a closing gate. The proxy defines the route, timing, and gate-state transition.",
      without: "The gate state and action sequence are less consistent.",
      with: "The gate transition follows the structural plan.",
    },
    key: {
      model: "MiniMax-H3", category: "NATIVE PROXY · DYNAMIC ACTION",
      description: "A key is concealed beneath a cup. The proxy supplies the reveal-and-reach sequence while the model realizes the setting.",
      without: "The intended object interaction is less reliable.",
      with: "The reveal-and-reach sequence is better retained.",
    },
  };
  const videos = $$(".video-grid video");
  const master = $("#video-with");
  const play = $("#play-comparison");
  const seek = $("#comparison-seek");
  let playing = false;
  let loading = false;
  let operation = 0;
  const format = (value) => {
    const seconds = Math.max(0, Math.floor(value || 0));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };
  function setPlayState(state) {
    playing = state;
    const label = state ? "Pause comparison" : "Play comparison";
    play.title = label;
    play.setAttribute("aria-label", label);
    play.innerHTML = `<i data-lucide="${state ? "pause" : "play"}"></i>`;
    icons();
  }
  function pause() {
    operation += 1;
    videos.forEach((video) => video.pause());
    setPlayState(false);
  }
  async function resume() {
    if (loading) return;
    loading = true;
    play.disabled = true;
    const currentOperation = ++operation;
    try {
      const results = await Promise.allSettled(videos.map((video) => video.play()));
      if (currentOperation !== operation) return;
      if (results.some((r) => r.status === "rejected")) {
        pause();
        $("#case-description").textContent = "Playback could not start. Please retry or open the video file directly.";
      } else {
        setPlayState(true);
      }
    } finally {
      loading = false;
      play.disabled = false;
    }
  }
  function moveTo(value) {
    videos.forEach((video) => {
      if (Number.isFinite(video.duration)) video.currentTime = Math.min(value, Math.max(0, video.duration - 0.01));
    });
    seek.value = value;
    updateTime();
  }
  function updateTime() {
    const duration = Number.isFinite(master.duration) ? master.duration : 15;
    seek.max = duration;
    seek.value = master.currentTime || 0;
    $("#comparison-time").textContent = `${format(master.currentTime)} / ${format(duration)}`;
  }
  play.addEventListener("click", () => playing ? pause() : resume());
  $("#restart-comparison").addEventListener("click", () => {
    pause();
    moveTo(0);
  });
  seek.addEventListener("input", () => moveTo(Number(seek.value)));
  master.addEventListener("timeupdate", () => {
    updateTime();
    if (playing && master.readyState >= 3) {
      videos.filter((v) => v !== master).forEach((video) => {
        if (!video.ended && Math.abs(video.currentTime - master.currentTime) > 0.25) {
          video.currentTime = Math.min(master.currentTime, video.duration);
        }
      });
    }
  });
  master.addEventListener("loadedmetadata", updateTime);
  master.addEventListener("ended", pause);
  $("#comparison-sound").addEventListener("click", (event) => {
    master.muted = !master.muted;
    const button = event.currentTarget;
    const label = master.muted ? "Unmute proxy-guided output" : "Mute proxy-guided output";
    button.innerHTML = `<i data-lucide="${master.muted ? "volume-x" : "volume-2"}"></i>`;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(!master.muted));
    icons();
  });
  const tabs = $$(".case-tabs button");
  function renderPrompts(slug) {
    const prompts = window.PROXYGEN_PROMPTS?.[slug];
    $("#prompt-with").textContent = prompts?.with || "";
    $("#prompt-without").textContent = prompts?.without || "";
  }
  renderPrompts("bakery");
  tabs.forEach((button, index) => {
    button.addEventListener("click", () => {
      pause();
      const slug = button.dataset.case;
      const data = cases[slug];
      tabs.forEach((tab) => {
        const selected = tab === button;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      $("#comparison-panel").setAttribute("aria-labelledby", button.id);
      ["proxy", "without", "with"].forEach((type) => {
        const video = $(`#video-${type}`);
        video.poster = `assets/${slug}-${type}.webp`;
        video.src = `assets/${slug}-${type}.mp4`;
        video.load();
      });
      $("#case-model").textContent = data.model;
      $("#case-category").textContent = data.category;
      $("#case-description").textContent = data.description;
      $("#without-caption").textContent = data.without;
      $("#with-caption").textContent = data.with;
      renderPrompts(slug);
      updateTime();
    });
    button.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        tabs[next].click();
        tabs[next].focus();
      }
    });
  });

  const data = window.PROXYGEN_CHECKLIST;
  $$(".evidence-timeline button").forEach((button) => {
    button.addEventListener("click", () => {
      const video = $("#checklist-video");
      video.currentTime = Number(button.dataset.time);
      video.focus();
    });
  });
  function renderChecklist(dimension) {
    const container = $("#checklist-items");
    container.replaceChildren();
    for (const item of data.criteria.filter((row) => row.dimension === dimension).sort((a, b) => a.id.localeCompare(b.id))) {
      const article = document.createElement("article");
      article.className = "criterion";
      const heading = document.createElement("div");
      heading.className = "criterion-heading";
      const id = document.createElement("span");
      id.className = "criterion-id";
      id.textContent = `${item.id}${item.critical ? " · CRITICAL" : ""}`;
      const verdict = document.createElement("span");
      verdict.className = `criterion-verdict${item.passed === false ? " fail" : ""}${item.passed == null ? " unknown" : ""}`;
      const score = item.status === "not_applicable" ? "Not applicable" : item.score == null ? "Not scored" : Number(item.score).toFixed(2);
      verdict.innerHTML = `<i data-lucide="${item.passed == null ? "minus" : item.passed === false ? "x" : "check"}"></i>`;
      verdict.append(document.createTextNode(score));
      heading.append(id, verdict);
      const question = document.createElement("p");
      question.textContent = item.question;
      article.append(heading, question);
      if (item.status_reason) {
        const reason = document.createElement("p");
        reason.className = "criterion-status";
        reason.textContent = item.status_reason;
        article.append(reason);
      }
      if (item.audit_review) {
        const evidence = document.createElement("details");
        evidence.className = "criterion-full";
        const summary = document.createElement("summary");
        summary.textContent = "Review evidence";
        const observation = document.createElement("p");
        observation.textContent = item.audit_review.observed_evidence;
        const source = document.createElement("p");
        source.textContent = `Model review · ${item.audit_review.model} · ${item.audit_review.date}`;
        evidence.append(summary, observation, source);
        article.append(evidence);
      }
      container.append(article);
    }
    container.scrollTop = 0;
    icons();
  }
  if (data) {
    $("#checklist-prompt").textContent = data.prompt;
    const scores = $("#checklist-score");
    for (const [key, label] of [["P", "Preserve"], ["C", "Complete"], ["B", "Bind"]]) {
      const div = document.createElement("div");
      const value = document.createElement("strong");
      value.textContent = data.scores[key] == null ? "--" : (data.scores[key] * 100).toFixed(1);
      const name = document.createElement("span");
      name.textContent = label;
      div.append(value, name);
      scores.append(div);
    }
    renderChecklist("Preserve");
    $$(".checklist-filters button").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".checklist-filters button").forEach((b) => {
          b.classList.toggle("active", b === button);
          b.setAttribute("aria-pressed", String(b === button));
        });
        renderChecklist(button.dataset.dimension);
      });
    });
  }
  const rows = {
    no_audio: [
      ["Seedance-2.5", 77.4, 56.6, 69.3, 67.8, 45.0, 14.0],
      ["Kling-4.0", 74.6, 59.1, 65.2, 66.3, 42.5, 15.0],
      ["Wan-3.0", 73.2, 55.7, 64.2, 64.4, 39.9, 16.4],
      ["Seedance-2.0", 69.8, 50.5, 64.2, 61.5, 37.5, 17.4],
      ["MiniMax-H3", 63.9, 53.9, 66.7, 61.5, 34.4, 7.2],
    ],
    audio: [
      ["Seedance-2.5", 64.5, 61.2, 74.0, 66.6, 32.5, 4.0],
      ["Seedance-2.0", 63.3, 55.0, 71.8, 63.4, 31.4, 8.0],
      ["Wan-3.0", 61.7, 51.1, 62.4, 58.4, 32.4, 8.0],
      ["MiniMax-H3", 55.3, 53.6, 65.4, 58.1, 24.1, 2.0],
    ],
  };
  function renderResults(group) {
    const body = $("#results-table tbody");
    body.replaceChildren();
    const ranked = [...rows[group]].sort((a, b) => b[5] - a[5]);
    const highlights = $("#leaderboard-highlights");
    highlights.replaceChildren();
    ranked.slice(0, 3).forEach((row, index) => {
      const article = document.createElement("article");
      article.className = `leaderboard-place place-${index + 1}`;
      const rank = document.createElement("span");
      rank.className = "place-rank";
      rank.textContent = `0${index + 1}`;
      const name = document.createElement("h3");
      name.textContent = row[0];
      const score = document.createElement("strong");
      score.textContent = row[5].toFixed(1);
      const meter = document.createElement("div");
      meter.className = "place-meter";
      meter.setAttribute("aria-hidden", "true");
      const fill = document.createElement("span");
      fill.style.width = `${row[5]}%`;
      meter.append(fill);
      const label = document.createElement("span");
      label.className = "place-label";
      label.textContent = "Strict";
      article.append(rank, name, score, label, meter);
      highlights.append(article);
    });
    const best = rows[group][0].map((_, index) => index ? Math.max(...rows[group].map((r) => r[index])) : null);
    ranked.forEach((row, rank) => {
      const tr = document.createElement("tr");
      const position = document.createElement("td");
      position.className = "rank-cell";
      position.textContent = String(rank + 1).padStart(2, "0");
      tr.append(position);
      row.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        cell.textContent = index === 0 ? value : value.toFixed(1);
        if (index === 5) cell.classList.add("strict-cell");
        if (index && value === best[index]) cell.classList.add("best");
        tr.append(cell);
      });
      body.append(tr);
    });
  }
  $$(".result-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".result-tabs button").forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      renderResults(button.dataset.group);
    });
  });
  renderResults("no_audio");
  $("#copy-citation").addEventListener("click", async () => {
    const text = $("#bibtex").textContent;
    try {
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
          // Restricted browsers can still support selection-based copying.
        }
      }
      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        textarea.remove();
      }
      if (!copied) throw new Error("Copy unavailable");
      $("#copy-status").textContent = "Copied";
    } catch {
      $("#copy-status").textContent = "Copy unavailable";
    }
    setTimeout(() => { $("#copy-status").textContent = ""; }, 3000);
  });
  // Only one audio source should be audible at a time.
  $$("audio, #checklist-video").forEach((media) => {
    media.addEventListener("play", () => {
      pause();
      $$("audio, #checklist-video").filter((other) => other !== media).forEach((other) => other.pause());
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause();
      $$("audio, #checklist-video").forEach((media) => media.pause());
    }
  });
  icons();
})();
