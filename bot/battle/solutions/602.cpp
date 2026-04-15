#include <iostream>
#include <string>

using namespace std;

int freq[26];
int ans;

void bt(int n) {
    for (int i = 0; i < 26; i++) {
        if (freq[i] > 0) {
            ans++;
            freq[i]--;
            bt(n);
            freq[i]++;
        }
    }
}

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    for (char c : s) freq[c - 'A']++;
    ans = 0;
    bt(s.size());
    cout << ans << "\n";
    return 0;
}
