#include <iostream>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    int mx = 0;
    for (char c : s) mx = max(mx, c - '0');
    cout << mx << "\n";
    return 0;
}
