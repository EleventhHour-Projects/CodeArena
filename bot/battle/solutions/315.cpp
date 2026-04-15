#include <iostream>
#include <string>

using namespace std;

int waviness(int x) {
    string s = to_string(x);
    int w = 0;
    for (int i = 1; i + 1 < (int)s.size(); i++) {
        if (s[i] > s[i-1] && s[i] > s[i+1]) w++;
        if (s[i] < s[i-1] && s[i] < s[i+1]) w++;
    }
    return w;
}

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int L, R;
    if (!(cin >> L >> R)) return 0;
    long long ans = 0;
    for (int i = L; i <= R; i++)
        ans += waviness(i);
    cout << ans << "\n";
    return 0;
}
