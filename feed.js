import db from './database.js';
import authManager from './auth.js';

class FeedManager {
  constructor() {
    this.currentView = 'gallery'; // 'gallery' or 'feed'
    this.currentSort = 'recent'; // 'recent' or 'popular'
    this.memes = [];
    this.userVotes = new Set();
  }

  // Initialize feed
  init() {
    this.setupViewToggle();
    this.setupSortControls();
    this.loadMemes();
  }

  // Setup view toggle (gallery/feed)
  setupViewToggle() {
    const viewToggle = document.getElementById('viewToggle');
    if (!viewToggle) return;

    viewToggle.addEventListener('click', (e) => {
      if (e.target.classList.contains('toggle-option')) {
        const view = e.target.dataset.view;
        this.switchView(view);
      }
    });
  }

  // Switch between gallery and feed view
  switchView(view) {
    this.currentView = view;
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.view === view);
    });

    // Update container class
    const container = document.getElementById('memesContainer');
    if (view === 'gallery') {
      container.className = 'memes-grid';
    } else {
      container.className = 'memes-feed';
    }
  }

  // Setup sort controls
  setupSortControls() {
    const sortBtns = document.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sortBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSort = btn.dataset.sort;
        this.renderMemes();
      });
    });
  }

  // Load memes from InstantDB with real-time updates
  loadMemes() {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;

    // Query memes with user data
    db.subscribeQuery(
      {
        memes: {
          $: {
            order: {
              serverCreatedAt: 'desc'
            }
          }
        },
        votes: {
          $: {
            where: {
              userId: currentUser.id
            }
          }
        }
      },
      (resp) => {
        if (resp.error) {
          console.error('Error loading memes:', resp.error);
          return;
        }

        this.memes = resp.data.memes || [];
        
        // Track user's votes
        this.userVotes = new Set(
          (resp.data.votes || []).map(v => v.memeId)
        );

        this.renderMemes();
      }
    );
  }

  // Render memes based on current sort
  renderMemes() {
    const container = document.getElementById('memesContainer');
    const emptyState = document.getElementById('emptyState');

    if (!this.memes || this.memes.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = this.currentView === 'gallery' ? 'grid' : 'block';
    emptyState.style.display = 'none';

    // Sort memes
    const sortedMemes = [...this.memes].sort((a, b) => {
      if (this.currentSort === 'popular') {
        return (b.upvoteCount || 0) - (a.upvoteCount || 0);
      } else {
        return b.createdAt - a.createdAt;
      }
    });

    // Render meme cards
    container.innerHTML = sortedMemes.map(meme => this.createMemeCard(meme)).join('');

    // Add upvote listeners
    this.attachUpvoteListeners();
  }

  // Create meme card HTML
  createMemeCard(meme) {
    const isUpvoted = this.userVotes.has(meme.id);
    const upvoteCount = meme.upvoteCount || 0;
    const timeAgo = this.getTimeAgo(meme.createdAt);

    return `
      <div class="meme-card" data-meme-id="${meme.id}">
        <div class="meme-image-container">
          <img src="${meme.imageData}" alt="${meme.title || 'Meme'}" class="meme-image">
        </div>
        <div class="meme-info">
          <div class="meme-header">
            ${meme.title ? `<h3 class="meme-title">${this.escapeHtml(meme.title)}</h3>` : ''}
            <span class="meme-time">${timeAgo}</span>
          </div>
          <div class="meme-footer">
            <span class="meme-author">by ${this.escapeHtml(meme.username || 'Anonymous')}</span>
            <button class="upvote-btn ${isUpvoted ? 'upvoted' : ''}" data-meme-id="${meme.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${isUpvoted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span class="upvote-count">${upvoteCount}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Attach upvote button listeners
  attachUpvoteListeners() {
    const upvoteBtns = document.querySelectorAll('.upvote-btn');
    upvoteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const memeId = btn.dataset.memeId;
        this.toggleUpvote(memeId);
      });
    });
  }

  // Toggle upvote for a meme
  async toggleUpvote(memeId) {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;

    const isUpvoted = this.userVotes.has(memeId);

    try {
      if (isUpvoted) {
        // Remove upvote
        const voteQuery = await db.queryOnce({
          votes: {
            $: {
              where: {
                userId: currentUser.id,
                memeId: memeId
              }
            }
          }
        });

        const vote = voteQuery.data.votes?.[0];
        if (vote) {
          // Get current meme to decrement count
          const memeQuery = await db.queryOnce({
            memes: {
              $: {
                where: {
                  id: memeId
                }
              }
            }
          });
          
          const meme = memeQuery.data.memes?.[0];
          const newCount = Math.max(0, (meme?.upvoteCount || 0) - 1);
          
          await db.transact([
            db.tx.votes[vote.id].delete(),
            db.tx.memes[memeId].update({
              upvoteCount: newCount
            })
          ]);
        }
      } else {
        // Add upvote
        const voteId = crypto.randomUUID();
        
        // Get current meme to increment count
        const memeQuery = await db.queryOnce({
          memes: {
            $: {
              where: {
                id: memeId
              }
            }
          }
        });
        
        const meme = memeQuery.data.memes?.[0];
        const newCount = (meme?.upvoteCount || 0) + 1;
        
        await db.transact([
          db.tx.votes[voteId].update({
            userId: currentUser.id,
            memeId: memeId,
            createdAt: Date.now()
          }),
          db.tx.memes[memeId].update({
            upvoteCount: newCount
          })
        ]);
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
      this.showToast('Failed to update vote', 'error');
    }
  }

  // Get relative time string
  getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show toast notification
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

const feedManager = new FeedManager();
export default feedManager;
