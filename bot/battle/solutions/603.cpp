#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int nw;
    if (!(cin >> nw)) return 0;
    vector<string> words(nw);
    for (int i = 0; i < nw; i++) cin >> words[i];
    int ml;
    cin >> ml;
    vector<int> avail(26, 0);
    for (int i = 0; i < ml; i++) {
        char c; cin >> c;
        avail[c - 'a']++;
    }
    int k;
    cin >> k;
    vector<int> score(26);
    for (int i = 0; i < 26; i++) cin >> score[i];
    // Precompute letter counts for each word
    vector<vector<int>> wcount(nw, vector<int>(26, 0));
    for (int i = 0; i < nw; i++)
        for (char c : words[i])
            wcount[i][c - 'a']++;
    int ans = 0;
    for (int mask = 1; mask < (1 << nw); mask++) {
        vector<int> used(26, 0);
        int sc = 0;
        bool valid = true;
        for (int i = 0; i < nw && valid; i++) {
            if (mask & (1 << i)) {
                for (int j = 0; j < 26; j++) {
                    used[j] += wcount[i][j];
                    if (used[j] > avail[j]) { valid = false; break; }
                }
                if (valid)
                    for (int j = 0; j < 26; j++)
                        sc += wcount[i][j] * score[j];
            }
        }
        if (valid) ans = max(ans, sc);
    }
    cout << ans << "\n";
    return 0;
}
