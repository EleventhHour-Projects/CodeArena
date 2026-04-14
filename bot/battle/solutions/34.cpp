#include <iostream>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    int n = s.length();
    for (int i = 0; i < n; i++) {
        if (s[i] == s[n - 1 - i]) {
            cout << i << "\n";
            return 0;
        }
    }
    cout << "-1\n";
    return 0;
}
