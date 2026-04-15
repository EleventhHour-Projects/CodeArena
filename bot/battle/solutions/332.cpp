#include <iostream>
#include <vector>
#include <queue>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n, m;
    if (!(cin >> n >> m)) return 0;
    vector<vector<int>> grid(n, vector<int>(m));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            cin >> grid[i][j];
    // Find first island via DFS, then BFS to second island
    vector<vector<bool>> visited(n, vector<bool>(m, false));
    queue<pair<int,int>> q;
    bool found = false;
    // DFS to mark first island
    auto dfs = [&](auto& self, int r, int c) -> void {
        if (r < 0 || r >= n || c < 0 || c >= m) return;
        if (visited[r][c] || grid[r][c] == 0) return;
        visited[r][c] = true;
        q.push({r, c});
        self(self, r+1, c);
        self(self, r-1, c);
        self(self, r, c+1);
        self(self, r, c-1);
    };
    for (int i = 0; i < n && !found; i++)
        for (int j = 0; j < m && !found; j++)
            if (grid[i][j] == 1) {
                dfs(dfs, i, j);
                found = true;
            }
    // BFS from first island
    int dx[] = {0,0,1,-1}, dy[] = {1,-1,0,0};
    int steps = 0;
    while (!q.empty()) {
        int sz = q.size();
        while (sz--) {
            auto [r, c] = q.front(); q.pop();
            for (int d = 0; d < 4; d++) {
                int nr = r + dx[d], nc = c + dy[d];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m || visited[nr][nc]) continue;
                if (grid[nr][nc] == 1) {
                    cout << steps << "\n";
                    return 0;
                }
                visited[nr][nc] = true;
                q.push({nr, nc});
            }
        }
        steps++;
    }
    cout << 0 << "\n";
    return 0;
}
