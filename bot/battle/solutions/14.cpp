#include <iostream>
#include <string>

using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    string s, t;
    if (!(cin >> s >> t)) return 0;
    if (s == "-") s = "";
    if (t == "-") t = "";
    int i = 0, j = 0;
    int sn = s.length(), tn = t.length();
    while (i < sn && j < tn) {
        if (s[i] == t[j]) i++;
        j++;
    }
    if (i == sn) cout << "true\n";
    else cout << "false\n";
    return 0;
}
