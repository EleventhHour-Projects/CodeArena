#include <iostream>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s;
    if (!(cin >> s)) return 0;
    int bal = 0, res = 0;
    for (char c : s) {
        if (c == 'L') bal++;
        else bal--;
        if (bal == 0) res++;
    }
    cout << res << "\n";
    return 0;
}
