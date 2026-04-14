#include <iostream>
#include <string>
#include <vector>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    int n = s.length();
    int low = 0, high = n;
    for (int i = 0; i < n; i++) {
        if (s[i] == 'I') cout << low++ << " ";
        else cout << high-- << " ";
    }
    cout << low << "\n";
    return 0;
}
