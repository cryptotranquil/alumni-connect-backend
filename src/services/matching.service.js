/**
 * Matching Algorithm Service
 * Matches students with alumni based on department, skills, interests, and career goals
 */

class MatchingService {
  /**
   * Calculate match score between a student and an alumni
   */
  calculateMatchScore(student, alumni, mentorshipRequest) {
    let totalScore = 0;
    const matchDetails = {
      departmentMatch: false,
      skillMatches: [],
      interestMatches: [],
      industryMatch: false,
    };

    // 1. Department Match (30 points)
    if (student.department && alumni.department) {
      if (student.department === alumni.department) {
        matchDetails.departmentMatch = true;
        totalScore += 30;
      }
    }

    // 2. Skills Match (25 points)
    if (
      mentorshipRequest.skills &&
      mentorshipRequest.skills.length > 0 &&
      alumni.skills &&
      alumni.skills.length > 0
    ) {
      const studentSkills = mentorshipRequest.skills.map((s) =>
        s.toLowerCase(),
      );
      const alumniSkills = alumni.skills.map((s) => s.toLowerCase());

      const matchedSkills = studentSkills.filter((skill) =>
        alumniSkills.includes(skill),
      );

      matchDetails.skillMatches = matchedSkills;

      if (matchedSkills.length > 0) {
        const skillMatchPercentage =
          matchedSkills.length / studentSkills.length;
        totalScore += Math.min(25, skillMatchPercentage * 25);
      }
    }

    // 3. Interests Match (20 points)
    if (
      mentorshipRequest.interests &&
      mentorshipRequest.interests.length > 0 &&
      alumni.interests &&
      alumni.interests.length > 0
    ) {
      const studentInterests = mentorshipRequest.interests.map((i) =>
        i.toLowerCase(),
      );
      const alumniInterests = alumni.interests.map((i) => i.toLowerCase());

      const matchedInterests = studentInterests.filter((interest) =>
        alumniInterests.includes(interest),
      );

      matchDetails.interestMatches = matchedInterests;

      if (matchedInterests.length > 0) {
        const interestMatchPercentage =
          matchedInterests.length / studentInterests.length;
        totalScore += Math.min(20, interestMatchPercentage * 20);
      }
    }

    // 4. Industry Match (15 points)
    if (
      mentorshipRequest.preferredIndustry &&
      (alumni.position || alumni.company)
    ) {
      const industryKeywords = mentorshipRequest.preferredIndustry
        .toLowerCase()
        .split(" ")
        .filter((k) => k.length > 3);
      const alumniProfile =
        `${alumni.position || ""} ${alumni.company || ""} ${alumni.bio || ""}`.toLowerCase();

      const hasIndustryMatch = industryKeywords.some((keyword) =>
        alumniProfile.includes(keyword),
      );

      if (hasIndustryMatch) {
        matchDetails.industryMatch = true;
        totalScore += 15;
      }
    }

    // 5. Experience Level (10 points)
    if (alumni.graduationYear) {
      const currentYear = new Date().getFullYear();
      const yearsOfExperience = currentYear - parseInt(alumni.graduationYear);

      if (yearsOfExperience >= 5) {
        totalScore += 10;
      } else if (yearsOfExperience >= 2) {
        totalScore += 7;
      } else if (yearsOfExperience >= 1) {
        totalScore += 4;
      }
    }

    return {
      matchScore: Math.round(totalScore),
      matchDetails,
    };
  }

  /**
   * Find best matches for a student
   */
  findBestMatches(alumniList, student, mentorshipRequest) {
    const matches = [];

    for (const alumni of alumniList) {
      if (alumni.accountStatus !== "active") continue;

      const { matchScore, matchDetails } = this.calculateMatchScore(
        student,
        alumni,
        mentorshipRequest,
      );

      matches.push({
        alumniId: alumni.id,
        alumni: {
          _id: alumni.id, // key kept as `_id` here for output-shape compatibility with the frontend
          name: `${alumni.firstname || ""} ${alumni.lastname || ""}`.trim(),
          email: alumni.email,
          profilePhoto: alumni.profilePhoto,
          department: alumni.department,
          graduationYear: alumni.graduationYear,
          position: alumni.position,
          company: alumni.company,
          skills: alumni.skills,
          interests: alumni.interests,
          bio: alumni.bio,
        },
        matchScore,
        matchDetails,
      });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  getMatchThreshold() {
    return 40;
  }

  filterMatchesByThreshold(matches) {
    const threshold = this.getMatchThreshold();
    return matches.filter((match) => match.matchScore >= threshold);
  }
}

module.exports = new MatchingService();