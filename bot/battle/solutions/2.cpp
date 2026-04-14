#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

bool isAnagram(string s1, string s2) {
    if (s1.length() != s2.length()) return false;
    sort(s1.begin(), s1.end());
    sort(s2.begin(), s2.end());
    return s1 == s2;
}

int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    int n;
    if (!(cin >> n)) return 0;
    if (n == 0) return 0;
    vector<string> words(n);
    for (int i = 0; i < n; i++) cin >> words[i];
    vector<string> result;
    result.push_back(words[0]);
    for (int i = 1; i < n; i++) {
        if (!isAnagram(words[i], result.back())) {
            result.push_back(words[i]);
        }
    }
    for (int i = 0; i < result.size(); i++) {
        cout << result[i] << (i == result.size() - 1 ? "" : " ");
    }
    cout << "\n";
    return 0;
}
